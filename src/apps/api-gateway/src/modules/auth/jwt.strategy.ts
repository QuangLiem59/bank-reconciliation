import { SessionDocument } from '@entities/session.entity';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SessionService } from 'src/apps/api-gateway/src/modules/session/session.service';
import { UserService } from 'src/apps/api-gateway/src/modules/user/user.service';
import { FilterOptions } from 'src/types/common.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const condition: FilterOptions<SessionDocument> = {
      _id: payload?.sessionId,
      is_revoked: false,
      expires_at: { $gt: new Date() },
    };
    const session = await this.sessionService.findOneByCondition(condition);
    if (!session.data) {
      throw new UnauthorizedException('Session is invalid or revoked.');
    }

    const user = await this.userService.findById(payload.sub, ['roles']);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
