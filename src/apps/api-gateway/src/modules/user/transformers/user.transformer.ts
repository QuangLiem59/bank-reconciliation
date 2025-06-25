import { User } from '@entities/user.entity';
import { BaseTransformerAbstract } from '@transformers/base.abstract.transformer';
import { RoleTransformer } from 'src/apps/api-gateway/src/modules/role/transformers/role.transformer';
import { IncludeOptions } from 'src/types/common.type';

import { ProfileTransformer } from './profile.transformer';

export class UserTransformer extends BaseTransformerAbstract<User, any> {
  protected availableIncludes = ['roles', 'profile'];
  protected defaultIncludes = [];

  async transform(user: User): Promise<object> {
    if (!user) return null;

    const includes = await this.includes(user);
    const response = {
      id: user.id || user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      active: user.active,
      last_active: user.last_active,
      profile: user.profile,

      ...includes,

      created_at: (user as any).created_at,
      updated_at: (user as any).updated_at,
    };

    return response;
  }

  includeProfile(
    user: User,
    subIncludes?: IncludeOptions | (IncludeOptions | string)[],
  ) {
    if (!user.profile) return null;
    return new ProfileTransformer(subIncludes).transform(user.profile);
  }

  async includeRoles(
    user: User,
    subIncludes?: IncludeOptions | (IncludeOptions | string)[],
  ) {
    if (!user.roles) return null;

    const transformedData = await Promise.all(
      user.roles.map((role: any) =>
        new RoleTransformer(subIncludes).transform(role),
      ),
    );

    return transformedData;
  }
}
