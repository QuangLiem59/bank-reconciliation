import { Logger as NestLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { join } from 'path';
import { configSwagger } from 'src/config/api-docs.config';
import { AllExceptionsFilter } from 'src/filter/all-exceptions.filter';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new NestLogger('ApiGateway', { timestamp: true });
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    logger: logger,
  });
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  app.use(helmet());

  // Global pipes and filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',')
        : true,
    credentials: true,
  });

  // Swagger documentation
  app.use('/api/docs', (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      const credentials = Buffer.from(
        authHeader.split(' ')[1],
        'base64',
      ).toString('utf-8');
      const [username, password] = credentials.split(':');
      if (
        username === process.env.DOCUMENT_USER &&
        password === process.env.DOCUMENT_PASSWORD
      ) {
        return next();
      }
    }
    res.set('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
    res
      .status(401)
      .send('Authentication required to access the API documentation');
  });

  configSwagger(app);
  app.useStaticAssets(join(__dirname, '../../../served'));

  await app.listen(port, '0.0.0.0');
  logger.log(`API Gateway running on port ${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api`);
}

bootstrap().catch((error) => {
  NestLogger.error('Failed to start API Gateway', error);
  process.exit(1);
});
