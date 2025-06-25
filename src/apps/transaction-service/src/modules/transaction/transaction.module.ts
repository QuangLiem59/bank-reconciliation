import { Transaction, TransactionSchema } from '@entities/transaction.entity';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionsRepository } from '@repositories/transaction/transaction.repository';

import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
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
    ]),
  ],
  providers: [
    TransactionService,
    {
      provide: 'TransactionsRepositoryInterface',
      useClass: TransactionsRepository,
    },
  ],
  exports: [
    TransactionService,
    MongooseModule,
    {
      provide: 'TransactionsRepositoryInterface',
      useClass: TransactionsRepository,
    },
  ],
  controllers: [TransactionController],
})
export class TransactionModule {}
