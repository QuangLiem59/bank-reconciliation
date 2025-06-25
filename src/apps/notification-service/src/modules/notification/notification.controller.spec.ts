import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      controllers: [NotificationController],
      providers: [
        {
          provide: Reflector,
          useValue: new Reflector(),
        },
        {
          provide: NotificationService,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
