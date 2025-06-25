import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UPLOAD_STATUS } from 'src/types/file-upload.type';

import { BaseEntity } from './shared/base/base.entity';

export type FileProcessingDocument = HydratedDocument<FileProcessing>;

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
export class FileProcessing extends BaseEntity {
  @Prop({ required: true, unique: true, index: true })
  uploadId: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  fileSize: number;

  @Prop({ required: true, enum: ['csv', 'excel'] })
  fileType: string;

  @Prop({
    required: true,
    enum: Object.values(UPLOAD_STATUS),
    default: UPLOAD_STATUS.PENDING,
    index: true,
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop()
  processedAt?: Date;

  @Prop({ default: 0 })
  totalRecords: number;

  @Prop({ default: 0 })
  processedRecords: number;

  @Prop({ default: 0 })
  successfulRecords: number;

  @Prop({ default: 0 })
  failedRecords: number;

  @Prop({ type: [{ row: Number, error: String }], default: [] })
  errors: Array<{ row: number; error: string }>;

  @Prop()
  filePath?: string;

  @Prop()
  gridFsFileId?: string;
}

export const FileProcessingSchema =
  SchemaFactory.createForClass(FileProcessing);

FileProcessingSchema.index({ userId: 1, createdAt: -1 });
FileProcessingSchema.index({ status: 1, createdAt: -1 });
FileProcessingSchema.index({ fileName: 1 });
