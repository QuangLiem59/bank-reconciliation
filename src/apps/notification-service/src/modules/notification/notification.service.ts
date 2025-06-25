// src/apps/notification-service/src/modules/notification/notification.service.ts
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';

import { MailService } from '../mail/mail.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from './dto/notification.dto';

interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: any;
  status: NotificationStatus;
  channels: string[];
  createdAt: Date;
  sentAt?: Date;
  attempts: number;
  maxAttempts: number;
  error?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly notifications = new Map<string, NotificationRecord>();

  // Metrics tracking
  private metrics = {
    totalSent: 0,
    totalFailed: 0,
    totalPending: 0,
    emailsSent: 0,
    websocketsSent: 0,
    lastResetDate: new Date(),
  };

  // Notification templates
  private readonly templates = {
    transaction_created: {
      title: 'Transaction Created',
      message: 'A new {{type}} transaction of {{amount}} has been processed.',
      emailSubject: 'Transaction Notification - {{type}}',
      emailTemplate: 'transaction-created',
    },
    file_processing_started: {
      title: 'File Processing Started',
      message: 'Your file "{filename}" (ID: {uploadId}) is now being processed',
      emailSubject: 'File Processing Started - {{filename}}',
      emailTemplate: 'file-processing-started',
    },
    file_processing_progress: {
      title: 'File Processing Progress',
      message: 'Processing is {progress}% complete',
      emailSubject: 'File Processing Update - {{filename}}',
      emailTemplate: 'file-processing-progress',
    },
    file_processing_completed: {
      title: 'File Processing Completed',
      message:
        'Successfully processed {filename}! {successCount} records imported',
      emailSubject: 'File Processing Complete - {{filename}}',
      emailTemplate: 'file-processing-completed',
    },
    file_processing_failed: {
      title: 'File Processing Failed',
      message: 'Failed to process {filename} ({errorCount} errors)',
      emailSubject: 'File Processing Failed - {{filename}}',
      emailTemplate: 'file-processing-failed',
    },
  };

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly webSocketGateway: RealtimeGateway,
    private readonly emailService: MailService,
    @InjectQueue('notification-queue')
    private readonly notificationQueue: Queue,
    @InjectQueue('email-queue')
    private readonly emailQueue: Queue,
  ) {
    this.setupQueueProcessors();
  }

  private setupQueueProcessors() {
    // Process notification queue
    this.notificationQueue.process('send-notification', async (job) => {
      const { notificationId } = job.data;
      return this.processNotification(notificationId);
    });

    // Process email queue
    this.emailQueue.process('send-email', async (job) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { notificationId, emailData } = job.data;
      return this.emailService.sendNotification(emailData.to, {
        title: emailData.subject,
        message: emailData.template,
        ctaLink: emailData.data?.ctaLink,
        ctaText: emailData.data?.ctaText,
      });
    });
  }

  async sendNotification(dto: any) {
    const notificationId = uuidv4();

    const notification: NotificationRecord = {
      id: notificationId,
      userId: dto.userId,
      type: dto.type,
      priority: dto.priority || NotificationPriority.MEDIUM,
      title: dto.title,
      message: dto.message,
      data: dto.data,
      status: NotificationStatus.PENDING,
      channels: dto.channels || ['websocket'],
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: dto.maxAttempts || 3,
    };

    this.notifications.set(notificationId, notification);
    this.metrics.totalPending++;

    // Queue for processing
    await this.notificationQueue.add(
      'send-notification',
      { notificationId },
      {
        priority: this.getPriorityValue(notification.priority),
        attempts: notification.maxAttempts,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    // Emit internal event
    this.eventEmitter.emit('notification.created', {
      notificationId,
      userId: dto.userId,
      type: dto.type,
    });

    this.logger.log(
      `Notification queued: ${notificationId} for user ${dto.userId}`,
    );

    return {
      notificationId,
      status: NotificationStatus.PENDING,
      message: 'Notification queued successfully',
    };
  }

  private async processNotification(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }

    notification.attempts++;
    notification.status = NotificationStatus.PROCESSING;

    try {
      const results = await Promise.allSettled(
        notification.channels.map((channel) =>
          this.sendToChannel(notification, channel),
        ),
      );

      const hasFailures = results.some(
        (result) => result.status === 'rejected',
      );

      if (hasFailures && notification.attempts < notification.maxAttempts) {
        notification.status = NotificationStatus.PENDING;
        throw new Error('Some channels failed, retrying...');
      }

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      this.metrics.totalSent++;
      this.metrics.totalPending--;

      this.logger.log(`Notification sent successfully: ${notificationId}`);

      // Emit success event
      this.eventEmitter.emit('notification.sent', {
        notificationId,
        userId: notification.userId,
        channels: notification.channels,
      });
    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notification.error = error.message;
      this.metrics.totalFailed++;
      this.metrics.totalPending--;

      this.logger.error(`Notification failed: ${notificationId}`, error);

      // Emit failure event
      this.eventEmitter.emit('notification.failed', {
        notificationId,
        userId: notification.userId,
        error: error.message,
      });

      throw error;
    }
  }

  private async sendToChannel(
    notification: NotificationRecord,
    channel: string,
  ): Promise<void> {
    switch (channel) {
      case 'websocket':
        await this.sendWebSocketNotification(notification);
        this.metrics.websocketsSent++;
        break;

      case 'email':
        await this.sendEmailNotification(notification);
        this.metrics.emailsSent++;
        break;

      case 'push':
        this.logger.warn('Push notifications not yet implemented');
        break;

      default:
        throw new Error(`Unknown notification channel: ${channel}`);
    }
  }

  private async sendWebSocketNotification(
    notification: NotificationRecord,
  ): Promise<void> {
    const payload = {
      id: notification.id,
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      timestamp: new Date().toISOString(),
    };

    // Send to specific user
    this.webSocketGateway.sendNotificationToUser(notification.userId, payload);

    // Also broadcast to user's rooms if they exist
    this.webSocketGateway.sendNotificationToRoom(
      `user_${notification.userId}`,
      payload,
    );
  }

  private async sendEmailNotification(
    notification: NotificationRecord,
  ): Promise<void> {
    const template = this.templates[notification.type];
    if (!template) {
      throw new Error(`No email template found for type: ${notification.type}`);
    }

    const emailData = {
      to: notification.data?.email || `user${notification.userId}@example.com`, // In real app, get from user service
      subject: this.replaceTemplateVariables(
        template.emailSubject,
        notification.data || {},
      ),
      template: template.emailTemplate,
      data: {
        title: notification.title,
        message: notification.message,
        ...notification.data,
      },
    };

    await this.emailQueue.add('send-email', {
      notificationId: notification.id,
      emailData,
    });
  }

  private replaceTemplateVariables(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  private getPriorityValue(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.HIGH:
        return 10;
      case NotificationPriority.MEDIUM:
        return 5;
      case NotificationPriority.LOW:
        return 1;
      default:
        return 5;
    }
  }

  // Event handlers for different system events
  async handleTransactionCreated(data: any) {
    const template = this.templates.transaction_created;
    return this.sendNotification({
      userId: data.user_id,
      type: NotificationType.TRANSACTION,
      priority: NotificationPriority.MEDIUM,
      title: template.title,
      message: this.replaceTemplateVariables(template.message, data),
      data,
      channels: ['websocket', 'email'],
    });
  }

  async handleFileProcessingStarted(data: any) {
    const template = this.templates.file_processing_started;
    return this.sendNotification({
      userId: data.userId,
      type: NotificationType.FILE_PROCESSING,
      priority: NotificationPriority.HIGH,
      title: template.title,
      message: this.replaceTemplateVariables(template.message, data),
      data,
      channels: ['websocket'],
    });
  }

  async handleFileProcessingProgress(data: any) {
    // Only send progress updates every 10% or for significant milestones
    if (data.progress % 10 === 0 || data.progress > 95) {
      const template = this.templates.file_processing_progress;
      return this.sendNotification({
        userId: data.userId,
        type: NotificationType.FILE_PROCESSING,
        priority: NotificationPriority.LOW,
        title: template.title,
        message: this.replaceTemplateVariables(template.message, data),
        data,
        channels: ['websocket'],
      });
    }
  }

  async handleFileProcessingCompleted(data: any) {
    const template = this.templates.file_processing_completed;
    return this.sendNotification({
      userId: data.userId,
      type: NotificationType.FILE_PROCESSING,
      priority: NotificationPriority.HIGH,
      title: template.title,
      message: this.replaceTemplateVariables(template.message, data),
      data,
      channels: ['websocket', 'email'],
    });
  }

  async handleFileProcessingFailed(data: any) {
    const template = this.templates.file_processing_failed;
    return this.sendNotification({
      userId: data.userId,
      type: NotificationType.ERROR,
      priority: NotificationPriority.HIGH,
      title: template.title,
      message: this.replaceTemplateVariables(template.message, data),
      data,
      channels: ['websocket', 'email'],
    });
  }

  async sendEmail(data: any) {
    return this.emailService.sendNotification(data.to, {
      title: data.subject,
      message: data.template,
      ctaLink: data.data?.ctaLink,
      ctaText: data.data?.ctaText,
    });
  }

  // Event listeners for internal events
  @OnEvent('notification.created')
  private handleNotificationCreated(data: any) {
    this.logger.debug(`Notification created: ${data.notificationId}`);
  }

  @OnEvent('notification.sent')
  private handleNotificationSent(data: any) {
    this.logger.debug(`Notification sent: ${data.notificationId}`);
  }

  @OnEvent('notification.failed')
  private handleNotificationFailed(data: any) {
    this.logger.error(
      `Notification failed: ${data.notificationId} - ${data.error}`,
    );
  }
}
