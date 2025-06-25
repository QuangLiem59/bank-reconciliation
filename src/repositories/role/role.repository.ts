import { Role } from '@entities/role.entity';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseRepositoryAbstract } from '../base/base.abstract.repository';
import { RolesRepositoryInterface } from './roles.interface';

@Injectable()
export class RolesRepository
  extends BaseRepositoryAbstract<Role>
  implements RolesRepositoryInterface
{
  constructor(
    @InjectModel(Role.name)
    private readonly rolesModel: Model<Role>,
  ) {
    super(rolesModel);
  }
}
