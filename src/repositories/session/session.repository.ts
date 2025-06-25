import { Session } from '@entities/session.entity';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseRepositoryAbstract } from '../base/base.abstract.repository';
import { SessionsRepositoryInterface } from './sessions.interface';

@Injectable()
export class SessionsRepository
  extends BaseRepositoryAbstract<Session>
  implements SessionsRepositoryInterface
{
  constructor(
    @InjectModel(Session.name)
    private readonly sessionsModel: Model<Session>,
  ) {
    super(sessionsModel);
  }
}
