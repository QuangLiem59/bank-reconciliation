import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    RealtimeModule,
    MailModule,
    BullModule.registerQueue({
      name: 'email-queue',
    }),
    BullModule.registerQueue({
      name: 'notification-queue',
    }),
  ],
  providers: [NotificationService],
  exports: [NotificationService],
  controllers: [NotificationController],
})
export class NotificationModule {}
