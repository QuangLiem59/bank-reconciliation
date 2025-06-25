import { Process, Processor } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Job } from 'bull';
import { Types } from 'mongoose';
import * as Papa from 'papaparse';
import { firstValueFrom } from 'rxjs';
import { UPLOAD_STATUS } from 'src/types/file-upload.type';
import { TRANSACTION_TYPES } from 'src/types/transaction.type';
import * as XLSX from 'xlsx';

import { FileProcessingService } from '../file-processing.service';
import { GridFsService } from '../gridfs.service';

interface ProcessFileJobData {
  uploadId: string;
  userId: string;
  filename: string;
  mimetype: string;
  fileBuffer: string;
  description?: string;
  fileUploadId: string;
  gridFsFileId: string;
}

interface TransactionRow {
  date: string;
  content: string;
  amount: string;
  type: string;
}

@Processor('file-processing')
@Injectable()
export class FileProcessingProcessor {
  private readonly logger = new Logger(FileProcessingProcessor.name);

  constructor(
    private readonly fileProcessingService: FileProcessingService,
    @Inject('TRANSACTION_SERVICE')
    private readonly transactionClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
    private readonly gridFsService: GridFsService,
  ) {}

  @Process('process-file')
  async processFile(job: Job<ProcessFileJobData>) {
    const { uploadId, userId, filename, mimetype, fileUploadId, gridFsFileId } =
      job.data;
    const fileId = new Types.ObjectId(gridFsFileId);

    try {
      this.logger.log(`Starting file processing: ${uploadId}`);

      if (!(await this.gridFsService.fileExists(fileId))) {
        throw new Error(`File not found in GridFS: ${gridFsFileId}`);
      }

      await this.updateFileStatus(uploadId, UPLOAD_STATUS.PROCESSING);

      const buffer = await this.gridFsService.getFileBuffer(fileId);

      let parsedData: TransactionRow[];
      if (this.isCsvFile(mimetype, filename)) {
        parsedData = await this.parseCsvFile(buffer);
      } else if (this.isExcelFile(mimetype, filename)) {
        parsedData = await this.parseExcelFile(buffer);
      } else {
        throw new Error(`Unsupported file type: ${mimetype}`);
      }

      const totalRecords = parsedData.length;
      if (totalRecords === 0) {
        throw new Error('No valid records found in file');
      }

      await this.updateFileStatus(uploadId, UPLOAD_STATUS.PROCESSING, {
        totalRecords,
        updatedAt: new Date(),
      });

      const result = await this.processRecordsInBatches(
        parsedData,
        uploadId,
        userId,
        fileUploadId,
        job,
      );

      await this.updateFileStatus(uploadId, UPLOAD_STATUS.COMPLETED, {
        processedRecords: result.processed,
        successfulRecords: result.successful,
        failedRecords: result.errors.length,
        errors: result.errors.slice(0, 1000),
      });

      this.notificationClient.emit('file_processing_completed', {
        userId,
        uploadId,
        totalRecords,
        successfulRecords: result.successful,
        failedRecords: result.errors.length,
      });

      this.logger.log(
        `File processing completed: ${uploadId}. Success: ${result.successful}, Failed: ${result.errors.length}`,
      );
    } catch (error) {
      this.logger.error(`File processing failed: ${uploadId}`, error.stack);

      await this.updateFileStatus(uploadId, UPLOAD_STATUS.FAILED, {
        errors: [{ row: 0, error: error.message }],
      });

      this.notificationClient.emit('file_processing_failed', {
        userId,
        uploadId,
        error: error.message,
      });

      throw error;
    }
  }

  private async parseCsvFile(buffer: Buffer): Promise<TransactionRow[]> {
    return new Promise((resolve, reject) => {
      const csvString = buffer.toString('utf-8');

      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.toLowerCase().trim(),
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(
              new Error(`CSV parsing error: ${results.errors[0].message}`),
            );
            return;
          }
          resolve(results.data as TransactionRow[]);
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        },
      });
    });
  }

  private async parseExcelFile(buffer: Buffer): Promise<TransactionRow[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
      }) as string[][];

      if (jsonData.length < 2) {
        throw new Error(
          'Excel file must contain at least header and one data row',
        );
      }

      const headers = jsonData[0].map((h) => h.toLowerCase().trim());
      const dataRows = jsonData.slice(1);

      return dataRows.map((row) => {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj as TransactionRow;
      });
    } catch (error) {
      throw new Error(`Excel parsing error: ${error.message}`);
    }
  }

  private async processBatch(
    batch: TransactionRow[],
    uploadId: string,
    userId: string,
    fileUploadId: string,
    startRowIndex: number,
  ): Promise<{
    successful: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const transactions = [];
    const errors: Array<{ row: number; error: string }> = [];

    batch.forEach((row, index) => {
      try {
        const transaction = this.parseTransactionRow(
          row,
          uploadId,
          userId,
          fileUploadId,
          startRowIndex + index + 1,
        );
        transactions.push(transaction);
      } catch (error) {
        const rowNumber = startRowIndex + index + 1;
        errors.push({ row: rowNumber, error: error.message });
        this.logger.warn(`Skipping invalid row ${rowNumber}: ${error.message}`);
      }
    });

    if (transactions.length > 0) {
      await firstValueFrom(
        this.transactionClient.send('create_transactions', transactions),
      );
    }

    return { successful: transactions.length, errors };
  }

  private parseTransactionRow(
    row: TransactionRow,
    uploadId: string,
    userId: string,
    fileUploadId: string,
    rowNumber: number,
  ): object {
    try {
      const dateStr = row.date?.toString().trim();
      if (!dateStr) {
        throw new Error('Date is required');
      }

      let transactionDate: Date;

      // Try parsing DD/MM/YYYY HH:mm:ss format first
      if (dateStr.includes('/') && dateStr.includes(':')) {
        const [datePart, timePart] = dateStr.split(' ');
        const [day, month, year] = datePart.split('/');
        transactionDate = new Date(`${year}-${month}-${day} ${timePart}`);
      } else {
        transactionDate = new Date(dateStr);
      }

      if (isNaN(transactionDate.getTime())) {
        throw new Error(`Invalid date format: ${dateStr}`);
      }

      // Parse amount
      const amountStr = row.amount?.toString().trim().replace(/[+,]/g, '');
      if (!amountStr) {
        throw new Error('Amount is required');
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        throw new Error(`Invalid amount: ${row.amount}`);
      }

      // Parse type
      const typeStr = row.type?.toString().trim();
      if (!typeStr) {
        throw new Error('Transaction type is required');
      }

      const transactionType = typeStr.toLowerCase().includes('deposit')
        ? TRANSACTION_TYPES.DEPOSIT
        : TRANSACTION_TYPES.WITHDRAW;

      // Validate content
      const content = row.content?.toString().trim() || '';

      return {
        upload_id: uploadId,
        user_id: new Types.ObjectId(userId),
        fileUploadId: new Types.ObjectId(fileUploadId),
        date: transactionDate,
        content,
        amount: Math.abs(amount),
        type: transactionType,
        originalRowNumber: rowNumber,
      };
    } catch (error) {
      throw new Error(`Row ${rowNumber}: ${error.message}`);
    }
  }

  private async processRecordsInBatches(
    parsedData: TransactionRow[],
    uploadId: string,
    userId: string,
    fileUploadId: string,
    job: Job,
  ) {
    const batchSize = 500;
    const maxErrors = 1000;
    let processedRecords = 0;
    let successfulRecords = 0;
    const allErrors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < parsedData.length; i += batchSize) {
      const batch = parsedData.slice(i, i + batchSize);

      try {
        const batchResult = await this.processBatch(
          batch,
          uploadId,
          userId,
          fileUploadId,
          i,
        );

        processedRecords += batch.length;
        successfulRecords += batchResult.successful;

        if (allErrors.length < maxErrors) {
          const remainingSpace = maxErrors - allErrors.length;
          allErrors.push(...batchResult.errors.slice(0, remainingSpace));
        }

        if (i % (batchSize * 10) === 0 || i + batchSize >= parsedData.length) {
          const progress = Math.round(
            (processedRecords / parsedData.length) * 100,
          );

          await Promise.all([
            this.updateFileStatus(uploadId, UPLOAD_STATUS.PROCESSING, {
              processedRecords,
              successfulRecords,
              failedRecords: allErrors.length,
            }),
            job.progress(progress),
          ]);

          this.logger.log(
            `Progress: ${processedRecords}/${parsedData.length} (${progress}%) - ${uploadId}`,
          );
        }
      } catch (batchError) {
        this.logger.error(
          `Batch processing error at index ${i}:`,
          batchError.stack,
        );

        if (allErrors.length < maxErrors) {
          allErrors.push({
            row: i,
            error: `Batch processing failed: ${batchError.message}`,
          });
        }

        processedRecords += batch.length;
      }
    }

    return {
      processed: processedRecords,
      successful: successfulRecords,
      errors: allErrors,
    };
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

  private async updateFileStatus(
    uploadId: string,
    status: string,
    updates: Record<string, any> = {},
  ) {
    try {
      await this.fileProcessingService.update(
        { uploadId },
        {
          status,
          ...updates,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to update file status: ${uploadId}`,
        error.stack,
      );
      throw error;
    }
  }
}
