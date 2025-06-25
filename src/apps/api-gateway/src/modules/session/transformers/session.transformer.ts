import { Session } from '@entities/session.entity';
import { BaseTransformerAbstract } from '@transformers/base.abstract.transformer';
import { UserTransformer } from 'src/apps/api-gateway/src/modules/user/transformers/user.transformer';
import { IncludeOptions } from 'src/types/common.type';

export class SessionTransformer extends BaseTransformerAbstract<Session, any> {
  protected availableIncludes = ['user'];
  protected defaultIncludes = [];

  async transform(session: Session): Promise<object> {
    if (!session) return null;

    const includes = await this.includes(session);
    const response = {
      id: session.id || session._id,
      device: session.device,
      ip: session.ip,
      location: session.location,
      expires_at: session.expires_at,
      is_revoked: session.is_revoked,
      last_active: session.last_active,

      ...includes,

      created_at: (session as any).created_at,
      updated_at: (session as any).updated_at,
    };

    return response;
  }

  includeUser(
    session: Session,
    subIncludes?: IncludeOptions | (IncludeOptions | string)[],
  ) {
    if (!session.user) return null;
    return new UserTransformer(subIncludes).transform(session.user);
  }
}
