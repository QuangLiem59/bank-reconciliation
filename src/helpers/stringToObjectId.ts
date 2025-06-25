import { Types } from 'mongoose';
import { EntityId } from 'src/types/common.type';

export function stringToObjectId(str: string): EntityId | string {
  if (typeof str !== 'string' && !Types.ObjectId.isValid(str)) {
    throw new Error('ObjectId must be converted from string');
  }

  if (Types.ObjectId.isValid(str)) {
    return new Types.ObjectId(str);
  }

  return str;
}

export function newObjectId(): EntityId {
  return new Types.ObjectId();
}
