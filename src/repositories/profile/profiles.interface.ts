import { Profile } from '@entities/profile.entity';
import { BaseRepositoryInterface } from '@repositories/base/base.interface.repository';

export interface ProfilesRepositoryInterface
  extends BaseRepositoryInterface<Profile> {}
