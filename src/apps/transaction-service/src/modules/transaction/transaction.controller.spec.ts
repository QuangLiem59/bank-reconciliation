import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerStorage,
} from '@nestjs/throttler';

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
            createTransaction: jest.fn(),
            findOne: jest.fn(),
            updateTransaction: jest.fn(),
            delete: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
