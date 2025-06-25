import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { SessionService } from 'src/apps/api-gateway/src/modules/session/session.service';
import { UserService } from 'src/apps/api-gateway/src/modules/user/user.service';
import { MailService } from 'src/mail/mail.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60,
            limit: 10,
          },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: ThrottlerGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: 'THROTTLER:MODULE_OPTIONS',
          useValue: {},
        },
        {
          provide: ThrottlerStorage,
          useValue: {},
        },
        {
          provide: Reflector,
          useValue: new Reflector(),
        },
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
            generateResetToken: jest.fn(),
            resetPassword: jest.fn(),
            validateOAuthLogin: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            createUser: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            revokeSessions: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendPasswordReset: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
