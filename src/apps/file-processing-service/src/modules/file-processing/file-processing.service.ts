import { FileProcessing } from '@entities/file-processing.entity';
import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileProcessingsRepositoryInterface } from '@repositories/fileProcessing/file-processings.interface';
import { Queue } from 'bull';
import { Types } from 'mongoose';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { EntityId } from 'src/types/common.type';
import { UPLOAD_STATUS } from 'src/types/file-upload.type';
import { v4 as uuidv4 } from 'uuid';

import { ProcessFileDto } from './dto/file-processing.dto';
import { GridFsService } from './gridfs.service';

@Injectable()
export class FileProcessingService extends BaseServiceAbstract<FileProcessing> {
  private readonly logger = new Logger(FileProcessingService.name);

  constructor(
    private readonly gridFsService: GridFsService,
    @Inject('FileProcessingsRepositoryInterface')
    private readonly fileProcessingsRepository: FileProcessingsRepositoryInterface,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
    @InjectQueue('file-processing')
    private fileProcessingQueue: Queue,
  ) {
    super(fileProcessingsRepository);
  }

  async processTransactionFile(data: ProcessFileDto) {
    const uploadId = uuidv4();
    const fileType = this.getFileType(data.originalname, data.mimetype);
    let gridFsFileId: EntityId = null;

    try {
      this.logger.log(`Processing file: ${data.originalname}`);
      this.logger.log(`Received buffer type: ${typeof data.buffer}`);
      this.logger.log(`Original size: ${data.size} bytes`);

      let fileBuffer: Buffer;
      try {
        if (typeof data.buffer === 'string') {
          this.logger.log('Converting base64 string to Buffer...');
          fileBuffer = Buffer.from(data.buffer, 'base64');
          this.logger.log(`Converted buffer size: ${fileBuffer.length} bytes`);

          if (fileBuffer.length !== data.size) {
            this.logger.warn(
              `Size mismatch: expected ${data.size}, got ${fileBuffer.length}`,
            );
          }
        } else if (Buffer.isBuffer(data.buffer)) {
          this.logger.log('Buffer already in correct format');
          fileBuffer = data.buffer;
        } else {
          throw new Error('Invalid buffer format received');
        }
      } catch (error) {
        this.logger.error('Failed to convert buffer:', error.message);
        throw new Error(`Invalid file data: ${error.message}`);
      }

      try {
        const originalRecordCount = this.recordCount(
          fileBuffer,
          data.mimetype,
          data.originalname,
        );
        this.logger.log(`Original buffer record count: ${originalRecordCount}`);
      } catch (error) {
        this.logger.error('Original buffer parsing failed:', error.message);
        throw new Error(`Original file is invalid: ${error.message}`);
      }

      this.logger.log('Uploading to GridFS...');
      gridFsFileId = await this.gridFsService.uploadFile(
        `${uploadId}_${data.originalname}`,
        fileBuffer,
        {
          userId: data.userId,
          originalName: data.originalname,
          uploadId,
          uploadedAt: new Date(),
          fileType,
          mimetype: data.mimetype,
          originalSize: data.size,
        },
      );

      this.logger.log(`File uploaded to GridFS with ID: ${gridFsFileId}`);

      let totalRecords = 0;
      try {
        totalRecords = this.recordCount(
          fileBuffer,
          data.mimetype,
          data.originalname,
        );
      } catch (error) {
        this.logger.warn(
          `Could not estimate record count for ${uploadId}:`,
          error.message,
        );
      }

      // Create file processing record
      const fileUpload = await this.fileProcessingsRepository.create({
        _id: new Types.ObjectId(),
        uploadId,
        userId: new Types.ObjectId(data.userId),
        originalName: data.originalname,
        fileName: `${uploadId}_${data.originalname}`,
        fileSize: data.size,
        fileType,
        status: UPLOAD_STATUS.PENDING,
        totalRecords,
        processedRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        errors: [],
        gridFsFileId: gridFsFileId.toString(),
        createdAt: new Date(),
      });

      this.notificationClient.emit('file_processing_started', {
        userId: data.userId,
        uploadId,
        filename: data.originalname,
        fileSize: data.size,
        fileType,
      });

      await this.fileProcessingQueue.add(
        'process-file',
        {
          uploadId,
          userId: data.userId,
          filename: data.originalname,
          mimetype: data.mimetype,
          description: data.description,
          fileUploadId: fileUpload._id.toString(),
          gridFsFileId: gridFsFileId.toString(),
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 10,
          removeOnFail: 50,
        },
      );

      this.logger.log(`File processing job queued: ${uploadId}`);

      return {
        uploadId,
        status: UPLOAD_STATUS.PENDING,
        message: 'File processing job has been queued successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to initiate file processing: ${uploadId}`,
        error.stack,
      );

      if (gridFsFileId) {
        try {
          await this.gridFsService.deleteFile(new Types.ObjectId(gridFsFileId));
        } catch (cleanupError) {
          this.logger.error(
            `Failed to cleanup GridFS file: ${gridFsFileId}`,
            cleanupError.stack,
          );
        }
      }

      throw error;
    }
  }

  async getFileStatus(uploadId: string, userId: string) {
    const fileUpload = await this.fileProcessingsRepository.findOneByCondition({
      uploadId,
      userId: new Types.ObjectId(userId),
    });

    if (!fileUpload || !fileUpload.data) {
      throw new NotFoundException('Upload not found');
    }

    const progress =
      fileUpload.data.totalRecords > 0
        ? Math.round(
            (fileUpload.data.processedRecords / fileUpload.data.totalRecords) *
              100,
          )
        : 0;

    const fileUploadData: any = fileUpload.data;

    return {
      uploadId: fileUploadData.uploadId,
      filename: fileUploadData.originalName,
      status: fileUploadData.status,
      progress,
      processedRecords: fileUploadData.processedRecords,
      totalRecords: fileUploadData.totalRecords,
      successfulRecords: fileUploadData.successfulRecords,
      failedRecords: fileUploadData.failedRecords,
      errors: fileUploadData.errors,
      uploadedAt: fileUploadData.created_at,
      processedAt: fileUploadData.processedAt,
      fileSize: fileUploadData.fileSize,
      fileType: fileUploadData.fileType,
    };
  }

  async getUploadHistory(userId: string) {
    const fileUploads = await this.fileProcessingsRepository.findAll(
      { userId: new Types.ObjectId(userId) },
      [],
      {
        sort: { created_at: -1 },
        limit: 50,
      },
    );

    return fileUploads.data?.map((upload) => {
      const progress =
        upload.totalRecords > 0
          ? Math.round((upload.processedRecords / upload.totalRecords) * 100)
          : 0;

      const uploadData: any = upload;
      return {
        uploadId: uploadData.uploadId,
        filename: uploadData.originalName,
        status: uploadData.status,
        progress,
        processedRecords: uploadData.processedRecords,
        totalRecords: uploadData.totalRecords,
        successfulRecords: uploadData.successfulRecords,
        failedRecords: uploadData.failedRecords,
        uploadedAt: uploadData.created_at,
        processedAt: uploadData.processedAt,
        fileSize: uploadData.fileSize,
        fileType: uploadData.fileType,
      };
    });
  }

  async updateFileStatus(
    uploadId: string,
    status: UPLOAD_STATUS,
    updateData: {
      totalRecords?: number;
      processedRecords?: number;
      successfulRecords?: number;
      failedRecords?: number;
      errors?: Array<{ row: number; error: string }>;
      processedAt?: Date;
    } = {},
  ) {
    const update: any = {
      status,
      updated_at: new Date(),
      ...updateData,
    };

    if (status === UPLOAD_STATUS.COMPLETED || status === UPLOAD_STATUS.FAILED) {
      update.processedAt = new Date();
    }

    await this.fileProcessingsRepository.update({ uploadId }, update);

    switch (status) {
      case UPLOAD_STATUS.COMPLETED:
        this.notificationClient.emit('file_processing_completed', {
          uploadId,
          ...updateData,
        });
        break;
      case UPLOAD_STATUS.FAILED:
        this.notificationClient.emit('file_processing_failed', {
          uploadId,
          ...updateData,
        });
        break;
      default:
        if (updateData.processedRecords) {
          this.notificationClient.emit('file_processing_progress', {
            uploadId,
            progress: Math.round(
              (updateData.processedRecords / updateData.totalRecords) * 100,
            ),
          });
        }
    }
  }

  private getFileType(filename: string, mimetype: string): 'csv' | 'excel' {
    if (mimetype.includes('csv') || filename.toLowerCase().endsWith('.csv')) {
      return 'csv';
    }
    if (
      mimetype.includes('excel') ||
      filename.toLowerCase().endsWith('.xlsx') ||
      filename.toLowerCase().endsWith('.xls')
    ) {
      return 'excel';
    }
    throw new Error(`Unsupported file type: ${mimetype}`);
  }

  private recordCount(
    buffer: Buffer,
    mimetype: string,
    filename: string,
  ): number {
    try {
      if (this.isCsvFile(mimetype, filename)) {
        const content = buffer.toString('utf8');
        const lineCount = content.split('\n').length;
        return Math.max(0, lineCount - 1);
      } else if (this.isExcelFile(mimetype, filename)) {
        const avgBytesPerRow = 100;
        return Math.floor(buffer.length / avgBytesPerRow);
      }
      return 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return 0;
    }
  }

  private isCsvFile(mimetype: string, filename: string): boolean {
    return mimetype.includes('csv') || filename.toLowerCase().endsWith('.csv');
  }

  private isExcelFile(mimetype: string, filename: string): boolean {
    return (
      mimetype.includes('excel') ||
      mimetype.includes('spreadsheet') ||
      filename.toLowerCase().endsWith('.xlsx') ||
      filename.toLowerCase().endsWith('.xls')
    );
  }
}
