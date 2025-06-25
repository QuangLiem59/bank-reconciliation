import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { UserService } from 'src/apps/api-gateway/src/modules/user/user.service';

import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

describe('TransactionController', () => {
  let controller: TransactionController;

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
      controllers: [TransactionController],
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
          provide: TransactionService,
          useValue: {
            findAll: jest.fn(),
            revokeTransaction: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
