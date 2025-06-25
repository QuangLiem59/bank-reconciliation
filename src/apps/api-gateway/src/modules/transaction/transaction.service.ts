import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { QueryParams } from 'src/types/common.type';

import { CreateTransactionDto } from './dto/transaction.dto';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private readonly transactionClient: ClientProxy;

  constructor(private readonly configService: ConfigService) {
    this.transactionClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: this.configService.get('TRANSACTION_SERVICE_HOST', 'localhost'),
        port: this.configService.get('TRANSACTION_SERVICE_PORT', 3002),
      },
    });
  }

  async getTransactions(filter: QueryParams, userId: string) {
    try {
      const response = await firstValueFrom(
        this.transactionClient.send('get_transactions', {
          userId,
          filter: filter,
        }),
      );
      return response;
    } catch (error) {
      this.logger.error('Get transactions failed', error);
      throw new HttpException(
        error.message || 'Failed to retrieve transactions',
        error.status || 500,
      );
    }
  }

  async getTransaction(id: string, userId: string) {
    try {
      const response = await firstValueFrom(
        this.transactionClient.send('get_transaction', {
          id,
          userId,
        }),
      );
      return response;
    } catch (error) {
      this.logger.error('Get transaction failed', error);
      throw new HttpException(
        error.message || 'Transaction not found',
        error.status || 500,
      );
    }
  }

  async createTransaction(
    createTransactionDto: CreateTransactionDto,
    userId: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.transactionClient.send('create_transaction', {
          ...createTransactionDto,
          user_id: userId,
        }),
      );
      return response;
    } catch (error) {
      this.logger.error('Create transaction failed', error);
      throw new HttpException(
        error.message || 'Failed to create transaction',
        error.status || 500,
      );
    }
  }

  async deleteTransaction(id: string, userId: string) {
    try {
      const response = await firstValueFrom(
        this.transactionClient.send('delete_transaction', {
          id,
          userId,
        }),
      );
      return response;
    } catch (error) {
      this.logger.error('Delete transaction failed', error);
      throw new HttpException(
        error.message || 'Failed to delete transaction',
        error.status || 500,
      );
    }
  }

  async onModuleDestroy() {
    await this.transactionClient.close();
  }
}
