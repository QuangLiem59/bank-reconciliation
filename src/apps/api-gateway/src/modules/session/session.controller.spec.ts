import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { UserService } from 'src/apps/api-gateway/src/modules/user/user.service';

import { SessionController } from './session.controller';
import { SessionService } from './session.service';

describe('SessionController', () => {
  let controller: SessionController;

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
      controllers: [SessionController],
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
          provide: SessionService,
          useValue: {
            findAll: jest.fn(),
            revokeSession: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<SessionController>(SessionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
