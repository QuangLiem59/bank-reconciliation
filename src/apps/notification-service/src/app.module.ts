import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TransformerModuleRefProvider } from '@transformers/transformer-module-ref.provider';
import { RedisCacheModule } from 'src/config/redis.config';
import { AppLoggerModule } from 'src/logger/logger.module';

import { NotificationModule } from './modules/notification/notification.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    AppLoggerModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisCacheModule,
    EventEmitterModule.forRoot({
      maxListeners: 10,
      wildcard: true,
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),

    // Realtime module
    RealtimeModule,

    // Feature modules
    NotificationModule,
  ],
  controllers: [],
  providers: [TransformerModuleRefProvider],
})
export class AppModule {}
