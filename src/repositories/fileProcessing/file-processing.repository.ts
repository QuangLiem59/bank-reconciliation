import { FileProcessing } from '@entities/file-processing.entity';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseRepositoryAbstract } from '../base/base.abstract.repository';
import { FileProcessingsRepositoryInterface } from './file-processings.interface';

@Injectable()
export class FileProcessingsRepository
  extends BaseRepositoryAbstract<FileProcessing>
  implements FileProcessingsRepositoryInterface
{
  constructor(
    @InjectModel(FileProcessing.name)
    private readonly fileProcessingsModel: Model<FileProcessing>,
  ) {
    super(fileProcessingsModel);
  }
}
