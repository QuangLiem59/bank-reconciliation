import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  EnhancedMongoChangeStreamService,
  EntityChangeService,
} from '@services/mongo/entity-change-system.service';
import { MongoChangeStreamManager } from '@services/mongo/mongo-change-stream.service';
import { TransformerModuleRefProvider } from '@transformers/transformer-module-ref.provider';
import { join } from 'path';
import { MongoDbModule } from 'src/config/mongo.config';
import { RedisCacheModule } from 'src/config/redis.config';
import { ThrottlerApiModule } from 'src/config/throttler.config';
import { AppLoggerModule } from 'src/logger/logger.module';

import { AuthModule } from './modules/auth/auth.module';
import { FileUploadModule } from './modules/file-upload/file-upload.module';
import { HealthModule } from './modules/health/health.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { RoleModule } from './modules/role/role.module';
import { SessionModule } from './modules/session/session.module';
import { SharedModule } from './modules/shared/base/shared.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    AppLoggerModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongoDbModule.forRootWithUri(process.env.GATEWAY_MONGODB_URI),
    ThrottlerApiModule,
    RedisCacheModule,
    EventEmitterModule.forRoot({
      maxListeners: 10,
      wildcard: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/public',
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'default-secret',
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
      }),
    }),
    HttpModule,

    // Health check module
    HealthModule,

    // Realtime module
    RealtimeModule,

    // Feature modules
    RoleModule,
    UserModule,
    AuthModule,
    SessionModule,
    SharedModule,
    TransactionModule,
    FileUploadModule,
  ],
  controllers: [],
  providers: [
    MongoChangeStreamManager,
    EntityChangeService,
    EnhancedMongoChangeStreamService,
    TransformerModuleRefProvider,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
