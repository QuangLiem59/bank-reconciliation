import { Transaction } from '@entities/transaction.entity';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TransactionsRepositoryInterface } from '@repositories/transaction/transactions.interface';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';

import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';

@Injectable()
export class TransactionService extends BaseServiceAbstract<Transaction> {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @Inject('TransactionsRepositoryInterface')
    private readonly transactionsRepository: TransactionsRepositoryInterface,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
  ) {
    super(transactionsRepository);
  }

  async createTransactions(
    createTransactionDtos: CreateTransactionDto[],
  ): Promise<Transaction[]> {
    try {
      const transactions = await this.transactionsRepository.bulkInsert(
        createTransactionDtos as any[],
      );

      // Notify about transaction creation
      // transactions.forEach((transaction) => {
      //   this.notificationClient.emit('transaction_created', {
      //     transactionId: transaction._id,
      //     user_id: transaction.user_id,
      //     amount: transaction.amount,
      //     type: transaction.type,
      //   });
      // });

      return transactions;
    } catch (error) {
      this.logger.error('Failed to create transactions', error);
      throw error;
    }
  }

  async createTransaction(
    createTransactionDto: CreateTransactionDto & { user_id: string },
  ): Promise<Transaction> {
    try {
      const transaction =
        await this.transactionsRepository.create(createTransactionDto);

      // Notify about transaction creation
      this.notificationClient.emit('transaction_created', {
        transactionId: transaction._id,
        user_id: transaction.user_id,
        amount: transaction.amount,
        type: transaction.type,
      });

      this.logger.log(`Transaction created: ${transaction._id}`);
      return transaction;
    } catch (error) {
      this.logger.error('Failed to create transaction', error);
      throw error;
    }
  }

  async getSummary(
    userId: string,
    filter: TransactionFilterDto = {},
  ): Promise<{
    totalTransactions: number;
    totalDeposits: number;
    totalWithdrawals: number;
    balance: number;
    avgTransactionAmount: number;
  }> {
    const matchQuery: any = { userId };

    if (filter.dateFrom || filter.dateTo) {
      matchQuery.date = {};
      if (filter.dateFrom) {
        matchQuery.date.$gte = new Date(filter.dateFrom);
      }
      if (filter.dateTo) {
        matchQuery.date.$lte = new Date(filter.dateTo);
      }
    }

    const summary = await this.transactionsRepository.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalDeposits: {
            $sum: {
              $cond: [{ $eq: ['$type', 'Deposit'] }, '$amount', 0],
            },
          },
          totalWithdrawals: {
            $sum: {
              $cond: [{ $eq: ['$type', 'Withdraw'] }, { $abs: '$amount' }, 0],
            },
          },
          avgTransactionAmount: { $avg: '$amount' },
        },
      },
      {
        $project: {
          _id: 0,
          totalTransactions: 1,
          totalDeposits: 1,
          totalWithdrawals: 1,
          balance: { $subtract: ['$totalDeposits', '$totalWithdrawals'] },
          avgTransactionAmount: { $round: ['$avgTransactionAmount', 2] },
        },
      },
    ]);

    return (
      summary[0] || {
        totalTransactions: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        balance: 0,
        avgTransactionAmount: 0,
      }
    );
  }
}
