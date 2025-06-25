import { SessionDocument } from '@entities/session.entity';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { SessionService } from 'src/apps/api-gateway/src/modules/session/session.service';
import { UserService } from 'src/apps/api-gateway/src/modules/user/user.service';
import { FilterOptions } from 'src/types/common.type';

@Injectable()
export class WsJwtGuard {
  constructor(
    private jwtService: JwtService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  async validateToken(client: Socket) {
    const token =
      client.handshake.auth.token ||
      client.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new WsException('Unauthorized access');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      if (!payload?.sessionId || !payload?.sub) {
        throw new WsException('Invalid token payload');
      }

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
    } catch (error) {
      throw new WsException('Invalid token' + error.message);
    }
  }
}
