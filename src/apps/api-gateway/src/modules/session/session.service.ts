import { Session } from '@entities/session.entity';
import { Inject, Injectable } from '@nestjs/common';
import { SessionsRepositoryInterface } from '@repositories/session/sessions.interface';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { EntityId } from 'src/types/common.type';

import { SessionTransformer } from './transformers/session.transformer';

@Injectable()
export class SessionService extends BaseServiceAbstract<Session> {
  constructor(
    @Inject('SessionsRepositoryInterface')
    private readonly sessionsRepository: SessionsRepositoryInterface,
  ) {
    super(sessionsRepository);
  }

  async revokeSession(userId: EntityId | string, sessionId: EntityId) {
    const session = await this.sessionsRepository.update(
      {
        _id: sessionId,
        user: userId,
      },
      {
        is_revoked: true,
      },
      new SessionTransformer([]),
    );

    if (!session) {
      throw new Error('Session not found');
    }

    return session;
  }

  async revokeSessions(userId: EntityId | string) {
    return this.sessionsRepository.updateMany(
      {
        user: userId,
      },
      {
        is_revoked: true,
      },
    );
  }
}
