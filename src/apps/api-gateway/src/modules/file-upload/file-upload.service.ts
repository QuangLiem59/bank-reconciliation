import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { Multer } from 'multer';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

import {
  FileStatusResponseDto,
  FileUploadResponseDto,
} from './dto/file-upload.dto';

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private fileProcessingClient: ClientProxy;

  constructor(private configService: ConfigService) {
    this.fileProcessingClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: this.configService.get(
          'FILE_PROCESSING_SERVICE_HOST',
          'localhost',
        ),
        port: this.configService.get('FILE_PROCESSING_SERVICE_PORT', 3003),
      },
    });
  }

  async uploadTransactionFile(
    file: Multer.File,
    userId: string,
    description: string,
  ): Promise<FileUploadResponseDto> {
    this.logger.log(`Processing file upload for user: ${userId}`);

    try {
      const fileData = {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer.toString('base64'),
        userId,
        description,
        uploadedAt: new Date().toISOString(),
      };

      // Send file to file processing service
      const result = await firstValueFrom(
        this.fileProcessingClient
          .send('process_transaction_file', fileData)
          .pipe(timeout(30000)),
      );

      this.logger.log(`File processing initiated with ID: ${result.uploadId}`);

      return {
        uploadId: result.uploadId,
        filename: file.originalname,
        status: 'QUEUED',
        message: 'File uploaded successfully and queued for processing',
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        estimatedProcessingTime: this.estimateProcessingTime(file.size),
      };
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      throw new Error(`Failed to process file: ${error.message}`);
    }
  }

  async getFileUploadStatus(
    uploadId: string,
    userId: string,
  ): Promise<FileStatusResponseDto> {
    try {
      const result = await firstValueFrom(
        this.fileProcessingClient
          .send('get_file_status', { uploadId, userId })
          .pipe(timeout(10000)),
      );

      if (!result) {
        throw new NotFoundException('Upload not found');
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to get file status: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve file status: ${error.message}`);
    }
  }

  async getUploadHistory(userId: string): Promise<FileStatusResponseDto[]> {
    try {
      const result = await firstValueFrom(
        this.fileProcessingClient
          .send('get_upload_history', { userId })
          .pipe(timeout(10000)),
      );

      return result || [];
    } catch (error) {
      this.logger.error(`Failed to get upload history: ${error.message}`);
      throw new Error(`Failed to retrieve upload history: ${error.message}`);
    }
  }

  private estimateProcessingTime(fileSize: number): string {
    // Rough estimate: 8MB = 1 minute processing time
    const estimatedMinutes = Math.ceil(fileSize / (8 * 1024 * 1024));

    if (estimatedMinutes < 1) {
      return 'Less than 1 minute';
    } else if (estimatedMinutes < 60) {
      return `${estimatedMinutes} minute${estimatedMinutes > 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(estimatedMinutes / 60);
      const minutes = estimatedMinutes % 60;
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
    }
  }

  async onModuleDestroy() {
    await this.fileProcessingClient.close();
  }
}
