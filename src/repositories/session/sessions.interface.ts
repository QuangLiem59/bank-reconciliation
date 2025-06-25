import { Session } from '@entities/session.entity';
import { BaseRepositoryInterface } from '@repositories/base/base.interface.repository';

export interface SessionsRepositoryInterface
  extends BaseRepositoryInterface<Session> {}
