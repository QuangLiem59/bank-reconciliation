import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
export function configSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Bank Reconciliation System API')
    .setDescription(
      'Comprehensive API for bank transaction reconciliation and management',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and JWT management')
    .addTag('Transactions', 'Transaction CRUD operations and queries')
    .addTag('File Processing', 'CSV/Excel file upload and processing')
    .addTag('Health', 'System health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customJs: '/swagger-custom.served.js',
  });
}
