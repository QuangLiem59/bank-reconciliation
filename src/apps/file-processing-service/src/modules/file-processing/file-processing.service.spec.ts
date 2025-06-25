import { Test, TestingModule } from '@nestjs/testing';

import { FileProcessingService } from './file-processing.service';

describe('FileProcessingService', () => {
  let service: FileProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileProcessingService,
        {
          provide: 'FileProcessingsRepositoryInterface',
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<FileProcessingService>(FileProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
