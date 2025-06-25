import { Logger as NestLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from 'src/filter/all-exceptions.filter';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new NestLogger('Transaction', { timestamp: true });
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.TRANSACTION_SERVICE_HOST || 'localhost',
        port: parseInt(process.env.TRANSACTION_SERVICE_PORT) || 3002,
      },
      bufferLogs: true,
      logger: logger,
    },
  );
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

  await app.listen();
  logger.log(
    `Transaction service running on port ${process.env.TRANSACTION_SERVICE_PORT}`,
  );
}

bootstrap().catch((error) => {
  NestLogger.error('Failed to start Transaction service', error);
  process.exit(1);
});
