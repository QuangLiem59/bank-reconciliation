import { User } from '@entities/user.entity';
import { BaseRepositoryInterface } from '@repositories/base/base.interface.repository';
import { EntityId } from 'src/types/common.type';

export interface UsersRepositoryInterface
  extends BaseRepositoryInterface<User> {
  removeUser(id: EntityId): Promise<void>;
}
