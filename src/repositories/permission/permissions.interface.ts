import { Permission } from '@entities/permission.entity';
import { BaseRepositoryInterface } from '@repositories/base/base.interface.repository';

export interface PermissionsRepositoryInterface
  extends BaseRepositoryInterface<Permission> {}
