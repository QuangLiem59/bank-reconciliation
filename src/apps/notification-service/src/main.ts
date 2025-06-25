import { Logger as NestLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from 'src/filter/all-exceptions.filter';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new NestLogger('NotificationService', { timestamp: true });

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

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: process.env.NOTIFICATION_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.NOTIFICATION_SERVICE_PORT) || 3004,
    },
  });

  await app.startAllMicroservices();
  await app.listen(3007);
  logger.log(`Notification service running on port 3007`);
}

bootstrap().catch((error) => {
  NestLogger.error('Failed to start Notification service', error);
  process.exit(1);
});
