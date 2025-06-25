import { Session, SessionSchema } from '@entities/session.entity';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionsRepository } from '@repositories/session/session.repository';

import { SessionController } from './session.controller';
import { SessionService } from './session.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
  ],
  providers: [
    SessionService,
    { provide: 'SessionsRepositoryInterface', useClass: SessionsRepository },
  ],
  exports: [SessionService],
  controllers: [SessionController],
})
export class SessionModule {}
