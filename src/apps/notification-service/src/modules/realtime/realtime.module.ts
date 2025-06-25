import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { WsJwtGuard } from './jwt-ws-auth.guard';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [],
  providers: [RealtimeGateway, RealtimeService, WsJwtGuard, JwtService],
  exports: [RealtimeService, RealtimeGateway],
})
export class RealtimeModule {}
