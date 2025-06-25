import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SessionModule } from 'src/apps/api-gateway/src/modules/session/session.module';

import { MailModule } from '../mail/mail.module';
import { AuthConstants } from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { WsJwtGuard } from './jwt-ws-auth.guard';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '3600s' },
    }),
    JwtModule.registerAsync({
      useFactory: async () => ({
        secret: process.env.JWT_RESET_SECRET,
        signOptions: { expiresIn: process.env.JWT_RESET_EXPIRES },
      }),
      extraProviders: [{ provide: 'JWT_RESET', useExisting: JwtService }],
    }),
    SessionModule,
    MailModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    AuthConstants,
    GoogleStrategy,
    WsJwtGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, AuthConstants, WsJwtGuard],
})
export class AuthModule {}
