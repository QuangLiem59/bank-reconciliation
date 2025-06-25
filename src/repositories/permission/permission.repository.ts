import { Permission } from '@entities/permission.entity';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseRepositoryAbstract } from '../base/base.abstract.repository';
import { PermissionsRepositoryInterface } from './permissions.interface';

@Injectable()
export class PermissionsRepository
  extends BaseRepositoryAbstract<Permission>
  implements PermissionsRepositoryInterface
{
  constructor(
    @InjectModel(Permission.name)
    private readonly permissionsModel: Model<Permission>,
  ) {
    super(permissionsModel);
  }
}
