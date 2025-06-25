import { FileProcessing } from '@entities/file-processing.entity';
import { BaseTransformerAbstract } from '@transformers/base.abstract.transformer';

export class FileProcessingTransformer extends BaseTransformerAbstract<
  FileProcessing,
  any
> {
  protected availableIncludes = [];
  protected defaultIncludes = [];

  async transform(fileProcesing: FileProcessing): Promise<object> {
    if (!fileProcesing) return null;

    const includes = await this.includes(fileProcesing);
    const response = {
      id: fileProcesing.id || fileProcesing._id,
      uploadId: fileProcesing.uploadId,
      originalName: fileProcesing.originalName,
      fileName: fileProcesing.fileName,
      fileType: fileProcesing.fileType,
      fileSize: fileProcesing.fileSize,
      status: fileProcesing.status,
      userId: fileProcesing.userId,
      processedAt: fileProcesing.processedAt,
      totalRecords: fileProcesing.totalRecords,
      processedRecords: fileProcesing.processedRecords,
      successfulRecords: fileProcesing.successfulRecords,
      failedRecords: fileProcesing.failedRecords,
      errors: fileProcesing.errors,
      filePath: fileProcesing.filePath,

      ...includes,

      created_at: (fileProcesing as any).created_at,
      updated_at: (fileProcesing as any).updated_at,
    };

    return response;
  }
}
