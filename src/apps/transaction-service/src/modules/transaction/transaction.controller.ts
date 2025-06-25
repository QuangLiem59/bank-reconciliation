import { Transaction } from '@entities/transaction.entity';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  FindAllResponse,
  FindOneResponse,
  IncludeOptions,
  QueryParams,
} from 'src/types/common.type';

import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionService } from './transaction.service';
import { TransactionTransformer } from './transformers/transaction.transformer';

@Controller()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @MessagePattern('create_transactions')
  async createTransactions(
    @Payload() data: CreateTransactionDto[],
  ): Promise<Transaction[]> {
    return this.transactionService.createTransactions(data);
  }

  @MessagePattern('create_transaction')
  async createTransaction(
    @Payload() data: CreateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionService.createTransaction(data);
  }

  @MessagePattern('get_transactions')
  async getAllTransactions(
    @Payload() data: { userId: string; filter: QueryParams },
  ): Promise<FindAllResponse<Transaction>> {
    const { page, limit, include, ...filters } = data.filter;
    const skip = (page - 1) * limit;

    let populate: IncludeOptions | (IncludeOptions | string)[] = [];
    if (include) {
      populate = include.split(',');
    }

    const response = await this.transactionService.findAll(
      { ...filters },
      populate,
      {
        skip,
        limit,
      },
      new TransactionTransformer(populate),
    );

    return response;
  }

  @MessagePattern('get_transaction')
  async getTransactionById(
    @Payload() data: { id: string; userId: string },
  ): Promise<FindOneResponse<Transaction>> {
    return this.transactionService.findOne(
      data.id,
      [],
      new TransactionTransformer([]),
    );
  }

  @MessagePattern('delete_transaction')
  async deleteTransaction(
    @Payload() data: { id: string; userId: string },
  ): Promise<boolean> {
    return this.transactionService.delete(data.id);
  }
}
