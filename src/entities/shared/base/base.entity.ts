import { Prop } from '@nestjs/mongoose';
import { Expose, Transform } from 'class-transformer';
import { Types } from 'mongoose';

export class BaseEntity {
  _id?: Types.ObjectId;

  @Expose()
  @Transform((value) => value.obj?._id?.toString(), { toClassOnly: true })
  id?: string;

  @Prop({ default: null })
  deleted_at?: Date;
}
