import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getQueueToken } from '@nestjs/bull';
import { Logger as NestLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Queue } from 'bull';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from 'src/filter/all-exceptions.filter';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new NestLogger('FileProcessing', { timestamp: true });
  // const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  //   AppModule,
  //   {
  //     transport: Transport.TCP,
  //     options: {
  //       host: process.env.FILE_PROCESSING_SERVICE_HOST || 'localhost',
  //       port: parseInt(process.env.FILE_PROCESSING_SERVICE_PORT) || 3003,
  //     },
  //     bufferLogs: true,
  //     logger: logger,
  //   },
  // );
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: logger,
  });
  app.useLogger(app.get(Logger));

  // Global pipes and filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const fileProcessingQueue = app.get<Queue>(getQueueToken('file-processing'));

  createBullBoard({
    queues: [new BullAdapter(fileProcessingQueue)],
    serverAdapter,
  });
  app.use('/admin/queues', serverAdapter.getRouter());

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: process.env.FILE_PROCESSING_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.FILE_PROCESSING_SERVICE_PORT) || 3003,
    },
  });

  await app.startAllMicroservices();
  await app.listen(3006);
  logger.log(`File Processing service running on port 3006`);
}

bootstrap().catch((error) => {
  NestLogger.error('Failed to start File Processing service', error);
  process.exit(1);
});
