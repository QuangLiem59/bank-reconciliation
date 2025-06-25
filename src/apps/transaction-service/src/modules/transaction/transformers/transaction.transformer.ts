import { Transaction } from '@entities/transaction.entity';
import { BaseTransformerAbstract } from '@transformers/base.abstract.transformer';

export class TransactionTransformer extends BaseTransformerAbstract<
  Transaction,
  any
> {
  protected availableIncludes = [];
  protected defaultIncludes = [];

  async transform(transaction: Transaction): Promise<object> {
    if (!transaction) return null;

    const includes = await this.includes(transaction);
    const response = {
      id: transaction.id || transaction._id,
      date: transaction.date,
      type: transaction.type,
      amount: transaction.amount,
      content: transaction.content,
      user_id: transaction.user_id,
      upload_id: transaction.upload_id || null,
      originalRowNumber: transaction.originalRowNumber || 0,
      fileUploadId: transaction.fileUploadId || null,

      ...includes,

      created_at: (transaction as any).created_at,
      updated_at: (transaction as any).updated_at,
    };

    return response;
  }
}
