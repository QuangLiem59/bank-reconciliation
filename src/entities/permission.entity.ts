import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { BaseEntity } from './shared/base/base.entity';

export type PermissionDocument = HydratedDocument<Permission>;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Permission extends BaseEntity {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  api_path: string;

  @Prop()
  method: string;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
PermissionSchema.index({ api_path: 1, method: 1 }, { unique: true });
