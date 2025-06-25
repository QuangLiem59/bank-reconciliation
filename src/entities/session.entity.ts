import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

import { BaseEntity } from './shared/base/base.entity';
import { User } from './user.entity';

export type SessionDocument = HydratedDocument<Session>;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Session extends BaseEntity {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: User;

  @Prop({ required: true })
  device: string;

  @Prop({ required: true })
  ip: string;

  @Prop({ required: true })
  access_token: string;

  @Prop({ required: true })
  refresh_token: string;

  @Prop()
  location: string;

  @Prop({ default: Date.now, expires: '1d' })
  expires_at: Date;

  @Prop({ default: Date.now })
  last_active: Date;

  @Prop({ default: false })
  is_revoked: boolean;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
