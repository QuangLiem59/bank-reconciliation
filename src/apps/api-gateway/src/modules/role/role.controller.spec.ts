import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { UserService } from 'src/apps/api-gateway/src/modules/user/user.service';

import { RoleController } from './role.controller';
import { RoleService } from './role.service';

describe('RoleController', () => {
  let controller: RoleController;

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
      controllers: [RoleController],
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
          provide: RoleService,
          useValue: {
            createRole: jest.fn(),
            findOne: jest.fn(),
            updateRole: jest.fn(),
            delete: jest.fn(),
            findAll: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<RoleController>(RoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
