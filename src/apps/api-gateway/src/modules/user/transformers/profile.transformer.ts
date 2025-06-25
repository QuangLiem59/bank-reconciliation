import { Profile } from '@entities/profile.entity';
import { BaseTransformerAbstract } from '@transformers/base.abstract.transformer';
import { IncludeOptions } from 'src/types/common.type';

import { UserTransformer } from './user.transformer';

export class ProfileTransformer extends BaseTransformerAbstract<Profile, any> {
  protected availableIncludes = ['user'];
  protected defaultIncludes = [];

  async transform(profile: Profile): Promise<object> {
    if (!profile) return null;

    const includes = await this.includes(profile);
    const response = {
      id: profile.id || profile._id,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      gender: profile.gender,
      birthday: profile.birthday,
      address: profile.address,
      position: profile.position,

      ...includes,

      created_at: (profile as any).created_at,
      updated_at: (profile as any).updated_at,
    };

    return response;
  }

  includeUser(
    profile: Profile,
    subIncludes?: IncludeOptions | (IncludeOptions | string)[],
  ) {
    if (!profile.user) return null;
    return new UserTransformer(subIncludes).transform(profile.user);
  }
}
