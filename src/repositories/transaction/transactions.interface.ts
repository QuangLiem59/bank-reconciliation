import { Transaction } from '@entities/transaction.entity';
import { BaseRepositoryInterface } from '@repositories/base/base.interface.repository';

export interface TransactionsRepositoryInterface
  extends BaseRepositoryInterface<Transaction> {}
