import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendUserConfirmation(email: string, name: string, token: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Welcome to Our App! Confirm Your Email',
      template: './confirmation',
      context: {
        name,
        token,
      },
    });
  }

  async sendPasswordReset(email: string, resetLink: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Password Reset Request',
      template: './password-reset',
      context: { resetLink },
    });
  }

  async sendNotification(email: string, notification: any) {
    await this.mailerService.sendMail({
      // to: email,
      to: 'quangliem0808@gmail.com',
      subject: 'New Notification',
      template: './notification',
      context: {
        title: notification.title,
        message: notification.message,
        ctaLink: notification.ctaLink,
        ctaText: notification.ctaText,
      },
    });
  }
}
