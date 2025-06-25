import { Transaction } from '@entities/transaction.entity';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseRepositoryAbstract } from '../base/base.abstract.repository';
import { TransactionsRepositoryInterface } from './transactions.interface';

@Injectable()
export class TransactionsRepository
  extends BaseRepositoryAbstract<Transaction>
  implements TransactionsRepositoryInterface
{
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionsModel: Model<Transaction>,
  ) {
    super(transactionsModel);
  }
}
