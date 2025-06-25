import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TransformerModuleRefProvider } from '@transformers/transformer-module-ref.provider';
import { MongoDbModule } from 'src/config/mongo.config';
import { RedisCacheModule } from 'src/config/redis.config';
import { AppLoggerModule } from 'src/logger/logger.module';

import { TransactionModule } from './modules/transaction/transaction.module';

@Module({
  imports: [
    AppLoggerModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongoDbModule.forRootWithUri(process.env.TRANSACTION_MONGODB_URI),
    RedisCacheModule,
    EventEmitterModule.forRoot({
      maxListeners: 10,
      wildcard: true,
    }),

    // Feature modules
    TransactionModule,
  ],
  controllers: [],
  providers: [TransformerModuleRefProvider],
})
export class AppModule {}
