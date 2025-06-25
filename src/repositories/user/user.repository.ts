import { User } from '@entities/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UsersRepositoryInterface } from '@repositories/user/users.interface';
import { Model } from 'mongoose';
import { EntityId } from 'src/types/common.type';

import { BaseRepositoryAbstract } from '../base/base.abstract.repository';

@Injectable()
export class UsersRepository
  extends BaseRepositoryAbstract<User>
  implements UsersRepositoryInterface
{
  constructor(
    @InjectModel(User.name)
    private readonly usersModel: Model<User>,
  ) {
    super(usersModel);
  }

  async removeUser(id: EntityId): Promise<void> {
    const session = await this.usersModel.startSession();
    session.startTransaction();

    try {
      await this.usersModel
        .findByIdAndUpdate<User>(id, { deleted_at: new Date() }, { session })
        .exec();
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
