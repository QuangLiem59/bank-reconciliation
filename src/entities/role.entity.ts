import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { stringToObjectId } from 'src/helpers/stringToObjectId';

import { Permission } from './permission.entity';
import { BaseEntity } from './shared/base/base.entity';

export type RoleDocument = HydratedDocument<Role>;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Role extends BaseEntity {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  display_name: string;

  @Prop({
    type: [Types.ObjectId],
    ref: Permission.name,
    set: (permissions: any[]) =>
      permissions.map((permission) => stringToObjectId(permission)),
  })
  permissions: Types.ObjectId[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
