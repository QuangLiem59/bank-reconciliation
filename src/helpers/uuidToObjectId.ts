import { createHash } from 'crypto';
import { Types } from 'mongoose';

export function uuidToObjectId(uuid: string): Types.ObjectId {
  const hash = createHash('sha256').update(uuid).digest('hex');
  return new Types.ObjectId(hash.substring(0, 24));
}
