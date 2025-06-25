import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Exclude, Type } from 'class-transformer';
import { NextFunction } from 'express';
import {
  HydratedDocument,
  Model,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import { stringToObjectId } from 'src/helpers/stringToObjectId';
import { EntityId } from 'src/types/common.type';

import { Profile, ProfileDocument } from './profile.entity';
import { Role } from './role.entity';
import { BaseEntity } from './shared/base/base.entity';

export type UserDocument = HydratedDocument<User>;

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
export class User extends BaseEntity {
  @Prop({
    required: true,
    minlength: 2,
    maxlength: 300,
    set: (name: string) => {
      return name.trim();
    },
  })
  name: string;

  @Prop({
    required: true,
    unique: true,
    index: true,
    minlength: 2,
    maxlength: 300,
    set: (username: string) => {
      return username.trim();
    },
  })
  username: string;

  @Prop({
    required: true,
    unique: true,
    index: true,
    match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
  })
  email: string;

  @Prop({
    match: /^([+]\d{2})?\d{8,14}$/,
    get: (phone: string) => {
      if (!phone) {
        return;
      }
      return phone;
    },
  })
  phone: string;

  @Exclude()
  @Prop({
    required: true,
  })
  password: string;

  @Prop()
  verify_email_at: Date;

  @Prop()
  verify_phone_at: Date;

  @Prop({
    type: [Types.ObjectId],
    ref: Role.name,
    set: (roles: Role[]) => roles.map((role: any) => stringToObjectId(role)),
  })
  @Type(() => Types.ObjectId)
  roles: Types.ObjectId[];

  @Prop()
  social_id?: string;

  @Prop()
  social_provider?: string;

  @Prop()
  reset_password_token?: string;

  @Prop()
  reset_password_expire?: Date;

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: Date.now })
  last_active: Date;

  @Prop({
    default: 'en',
  })
  preferred_language?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
  })
  last_modified_by?: EntityId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Profile.name })
  @Type(() => Profile)
  profile: Profile;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });

export const UserSchemaFactory = (profileModel: Model<ProfileDocument>) => {
  const userSchema = UserSchema;

  userSchema.pre('findOneAndDelete', async function (next: NextFunction) {
    const session = this.getOptions().session;
    const user = await this.model.findOne(this.getFilter());

    if (!user || !user.profile) {
      return next();
    }

    await profileModel
      .deleteMany({ _id: user.profile })
      .session(session)
      .exec();

    return next();
  });

  userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
    next();
  });

  return userSchema;
};
