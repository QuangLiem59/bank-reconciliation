import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @MessagePattern('transaction_created')
  async handleTransactionCreated(@Payload() data: any) {
    return this.notificationService.handleTransactionCreated(data);
  }

  @MessagePattern('file_processing_started')
  async handleFileProcessingStarted(@Payload() data: any) {
    return this.notificationService.handleFileProcessingStarted(data);
  }

  @MessagePattern('file_processing_completed')
  async handleFileProcessingCompleted(@Payload() data: any) {
    return this.notificationService.handleFileProcessingCompleted(data);
  }

  @MessagePattern('file_processing_failed')
  async handleFileProcessingFailed(@Payload() data: any) {
    return this.notificationService.handleFileProcessingFailed(data);
  }

  @MessagePattern('file_processing_progress')
  async handleFileProcessingProgress(@Payload() data: any) {
    return this.notificationService.handleFileProcessingProgress(data);
  }

  @MessagePattern('send_email')
  async sendEmail(@Payload() data: any) {
    return this.notificationService.sendEmail(data);
  }
}
