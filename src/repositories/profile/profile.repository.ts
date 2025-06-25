import { Profile } from '@entities/profile.entity';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseRepositoryAbstract } from '../base/base.abstract.repository';
import { ProfilesRepositoryInterface } from './profiles.interface';

@Injectable()
export class ProfilesRepository
  extends BaseRepositoryAbstract<Profile>
  implements ProfilesRepositoryInterface
{
  constructor(
    @InjectModel(Profile.name)
    private readonly profilesModel: Model<Profile>,
  ) {
    super(profilesModel);
  }
}
