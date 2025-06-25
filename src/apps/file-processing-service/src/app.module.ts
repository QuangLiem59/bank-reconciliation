import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TransformerModuleRefProvider } from '@transformers/transformer-module-ref.provider';
import { MongoDbModule } from 'src/config/mongo.config';
import { RedisCacheModule } from 'src/config/redis.config';
import { AppLoggerModule } from 'src/logger/logger.module';

import { FileProcessingModule } from './modules/file-processing/file-processing.module';

@Module({
  imports: [
    AppLoggerModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongoDbModule.forRootWithUri(process.env.FILE_PROCESSING_MONGODB_URI),
    RedisCacheModule,
    EventEmitterModule.forRoot({
      maxListeners: 10,
      wildcard: true,
    }),
    // BullModule.forRoot({
    //   redis: {
    //     host: process.env.REDIS_HOST || 'localhost',
    //     port: parseInt(process.env.REDIS_PORT) || 6379,
    //   },
    // }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    FileProcessingModule,
  ],
  controllers: [],
  providers: [TransformerModuleRefProvider],
})
export class AppModule {}
