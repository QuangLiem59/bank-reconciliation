import {
  FileProcessing,
  FileProcessingSchema,
} from '@entities/file-processing.entity';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { FileProcessingsRepository } from '@repositories/fileProcessing/file-processing.repository';

import { FileProcessingController } from './file-processing.controller';
import { FileProcessingService } from './file-processing.service';
import { GridFsService } from './gridfs.service';
import { FileProcessingProcessor } from './processors/file-processing.processor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FileProcessing.name, schema: FileProcessingSchema },
    ]),
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('NOTIFICATION_SERVICE_HOST', 'localhost'),
            port: configService.get('NOTIFICATION_SERVICE_PORT', 3004),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'TRANSACTION_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('TRANSACTION_SERVICE_HOST', 'localhost'),
            port: configService.get('TRANSACTION_SERVICE_PORT', 3002),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    BullModule.registerQueue({
      name: 'file-processing',
      settings: {
        stalledInterval: 30 * 1000,
        maxStalledCount: 1,
      },
    }),
  ],
  providers: [
    FileProcessingService,
    GridFsService,
    {
      provide: 'FileProcessingsRepositoryInterface',
      useClass: FileProcessingsRepository,
    },
    FileProcessingProcessor,
  ],
  exports: [
    FileProcessingService,
    MongooseModule,
    GridFsService,
    {
      provide: 'FileProcessingsRepositoryInterface',
      useClass: FileProcessingsRepository,
    },
  ],
  controllers: [FileProcessingController],
})
export class FileProcessingModule {}
