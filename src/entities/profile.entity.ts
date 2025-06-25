import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { GENDER } from 'src/types/profile.type';

import { BaseEntity } from './shared/base/base.entity';
import { User } from './user.entity';

export type ProfileDocument = HydratedDocument<Profile>;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Profile extends BaseEntity {
  @Prop({ trim: true })
  bio: string;

  @Prop({
    default:
      'https://res.cloudinary.com/dhelpyr7u/image/upload/v1735695316/public/avatar/1c9e1ba6-7dae-4de1-baa5-acac81f2c91a_wofmhz.jpg',
  })
  avatar_url: string;

  @Prop()
  birthday: Date;

  @Prop({ enum: GENDER, default: GENDER.OTHER })
  gender: GENDER;

  @Prop()
  position: string;

  @Prop()
  address: string;

  @Type(() => User)
  user: User;

  static setupVirtuals(schema: MongooseSchema) {
    schema.virtual('user', {
      ref: 'User',
      localField: '_id',
      foreignField: 'profile',
      justOne: true,
    });
  }
}

const ProfileSchema = SchemaFactory.createForClass(Profile);
Profile.setupVirtuals(ProfileSchema);

export { ProfileSchema };
