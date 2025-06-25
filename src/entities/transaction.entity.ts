import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { EntityId } from 'src/types/common.type';
import { TRANSACTION_TYPES } from 'src/types/transaction.type';

import { BaseEntity } from './shared/base/base.entity';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  toJSON: {
    getters: true,
    virtuals: true,
  },
})
export class Transaction extends BaseEntity {
  @Prop({ required: true, index: true })
  date: Date;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({
    required: true,
    enum: Object.values(TRANSACTION_TYPES),
    index: true,
  })
  type: string;

  @Prop({ type: String, index: true })
  upload_id?: EntityId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    index: true,
  })
  user_id: EntityId;

  @Prop({ type: Number, default: 0 })
  originalRowNumber: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, index: true })
  fileUploadId?: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ date: -1, type: 1 });
TransactionSchema.index({ user_id: 1, date: -1 });
TransactionSchema.index({ upload_id: 1, createdAt: -1 });
TransactionSchema.index({ amount: 1, type: 1 });
