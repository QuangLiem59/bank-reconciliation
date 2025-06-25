import { FileProcessing } from '@entities/file-processing.entity';
import { BaseRepositoryInterface } from '@repositories/base/base.interface.repository';

export interface FileProcessingsRepositoryInterface
  extends BaseRepositoryInterface<FileProcessing> {}
