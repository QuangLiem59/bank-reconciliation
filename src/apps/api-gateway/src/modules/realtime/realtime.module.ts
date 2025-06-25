import { Module } from '@nestjs/common';
import { AuthModule } from 'src/apps/api-gateway/src/modules/auth/auth.module';

import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [AuthModule],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
