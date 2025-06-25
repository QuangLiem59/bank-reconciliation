import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard {
  constructor(private jwtService: JwtService) {}

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

      return payload;
    } catch (error) {
      throw new WsException('Invalid token' + error.message);
    }
  }
}
