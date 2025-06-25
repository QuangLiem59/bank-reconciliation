import { Role } from '@entities/role.entity';
import { BaseRepositoryInterface } from '@repositories/base/base.interface.repository';

export interface RolesRepositoryInterface
  extends BaseRepositoryInterface<Role> {}
