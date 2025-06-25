import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from 'src/apps/api-gateway/src/modules/session/session.service';
import { UserService } from 'src/apps/api-gateway/src/modules/user/user.service';

import { AuthConstants } from './auth.constants';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        AuthConstants,
        ConfigService,
        {
          provide: UserService,
          useValue: {
            findByEmail: jest.fn(),
            findOneByCondition: jest.fn(),
            createUser: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
            decode: jest.fn(),
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            findOneByCondition: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
