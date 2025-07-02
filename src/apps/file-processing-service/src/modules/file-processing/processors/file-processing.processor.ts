import { Process, Processor } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Job } from 'bull';
import { Types } from 'mongoose';
import * as Papa from 'papaparse';
import { firstValueFrom, timeout } from 'rxjs';
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

      let result: {
        processed: number;
        successful: number;
        errors: Array<{ row: number; error: string }>;
      };

      if (this.isCsvFile(mimetype, filename)) {
        result = await this.processCsvFile(
          buffer,
          uploadId,
          userId,
          fileUploadId,
          job,
        );
      } else if (this.isExcelFile(mimetype, filename)) {
        result = await this.processExcelFileStreaming(
          buffer,
          uploadId,
          userId,
          fileUploadId,
          job,
        );
      } else {
        throw new Error(`Unsupported file type: ${mimetype}`);
      }

      await this.updateFileStatus(uploadId, UPLOAD_STATUS.COMPLETED, {
        processedRecords: result.processed,
        successfulRecords: result.successful,
        failedRecords: result.errors.length,
        errors: result.errors.slice(0, 1000),
      });

      this.notificationClient.emit('file_processing_completed', {
        userId,
        uploadId,
        totalRecords: result.processed,
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

  private async processCsvFile(
    buffer: Buffer,
    uploadId: string,
    userId: string,
    fileUploadId: string,
    job: Job,
  ): Promise<{
    processed: number;
    successful: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const parsedData = await this.parseCsvFile(buffer);

    if (parsedData.length === 0) {
      throw new Error('No valid records found in file');
    }

    return this.processRecordsInBatches(
      parsedData,
      uploadId,
      userId,
      fileUploadId,
      job,
    );
  }

  private async processExcelFileStreaming(
    buffer: Buffer,
    uploadId: string,
    userId: string,
    fileUploadId: string,
    job: Job,
  ): Promise<{
    processed: number;
    successful: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    this.logger.log('Starting streaming Excel processing');
    this.logger.log(
      `Memory usage before Excel processing: ${JSON.stringify(process.memoryUsage())}`,
    );

    const batchSize = 500;
    const maxErrors = 1000;
    let processedRecords = 0;
    let successfulRecords = 0;
    const allErrors: Array<{ row: number; error: string }> = [];
    let headers: string[] = [];
    let isFirstBatch = true;

    try {
      this.logger.log('Step 1: Reading Excel workbook...');

      const workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellStyles: false,
        cellNF: false,
        cellHTML: false,
        cellFormula: false,
        cellDates: true,
      });

      this.logger.log('Step 2: Excel workbook loaded successfully');

      const sheetName = workbook.SheetNames[0];
      this.logger.log(`Step 3: Using sheet: ${sheetName}`);

      const worksheet = workbook.Sheets[sheetName];
      this.logger.log('Step 4: Worksheet accessed');

      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const totalRows = range.e.r + 1;

      this.logger.log(`Step 5: Total rows calculated: ${totalRows}`);

      if (totalRows < 2) {
        throw new Error(
          'Excel file must contain at least header and one data row',
        );
      }

      this.logger.log(
        `Step 6: Starting chunk processing. Total rows: ${totalRows}`,
      );

      for (let startRow = 0; startRow < totalRows; startRow += batchSize) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const endRow = Math.min(startRow + batchSize - 1, range.e.r);

        this.logger.log(
          `Step 7.${Math.floor(startRow / batchSize)}: Processing Excel rows ${startRow + 1} to ${endRow + 1}`,
        );

        try {
          this.logger.log(
            `Step 7.${Math.floor(startRow / batchSize)}.1: Extracting chunk data...`,
          );

          const chunkData = this.extractExcelChunk(
            worksheet,
            range,
            startRow,
            endRow,
          );

          this.logger.log(
            `Step 7.${Math.floor(startRow / batchSize)}.2: Chunk extracted, size: ${chunkData.length}`,
          );

          if (isFirstBatch) {
            this.logger.log(
              `Step 7.${Math.floor(startRow / batchSize)}.3: Processing header row...`,
            );
            headers =
              chunkData[0]?.map((h) => h?.toString().toLowerCase().trim()) ||
              [];
            this.logger.log(
              `Step 7.${Math.floor(startRow / batchSize)}.4: Headers: ${headers.join(', ')}`,
            );
            chunkData.shift();
            isFirstBatch = false;

            if (chunkData.length === 0) {
              this.logger.log(
                `Step 7.${Math.floor(startRow / batchSize)}.5: Only header in first batch, continuing...`,
              );
              continue;
            }
          }

          this.logger.log(
            `Step 7.${Math.floor(startRow / batchSize)}.6: Converting to transaction rows...`,
          );

          const transactionRows = chunkData.map((row) => {
            const obj: any = {};
            headers.forEach((header, headerIndex) => {
              obj[header] = row[headerIndex]?.toString() || '';
            });
            return obj as TransactionRow;
          });

          this.logger.log(
            `Step 7.${Math.floor(startRow / batchSize)}.7: About to process batch with ${transactionRows.length} rows`,
          );

          const batchResult = await this.processBatch(
            transactionRows,
            uploadId,
            userId,
            fileUploadId,
            startRow === 0 ? 1 : startRow,
          );

          this.logger.log(
            `Step 7.${Math.floor(startRow / batchSize)}.8: Batch processed successfully`,
          );

          processedRecords += transactionRows.length;
          successfulRecords += batchResult.successful;

          if (allErrors.length < maxErrors) {
            const remainingSpace = maxErrors - allErrors.length;
            allErrors.push(...batchResult.errors.slice(0, remainingSpace));
          }

          if (
            processedRecords % (batchSize * 20) === 0 ||
            startRow + batchSize >= totalRows
          ) {
            const progress = Math.round(
              (processedRecords / (totalRows - 1)) * 100,
            );

            this.logger.log(
              `Step 7.${Math.floor(startRow / batchSize)}.9: Updating progress: ${progress}%`,
            );

            this.updateFileStatus(uploadId, UPLOAD_STATUS.PROCESSING, {
              processedRecords,
              successfulRecords,
              failedRecords: allErrors.length,
            }).catch((error) => {
              this.logger.error(
                `Status update failed during processing:`,
                error.message,
              );
            });

            await job.progress(progress);
            this.logger.log(
              `Excel Progress: ${processedRecords}/${totalRows - 1} (${progress}%)`,
            );
          }
        } catch (chunkError) {
          this.logger.error(
            `Excel chunk processing error at row ${startRow}:`,
            chunkError.message,
          );
          this.logger.error(`Chunk error stack:`, chunkError.stack);

          if (allErrors.length < maxErrors) {
            allErrors.push({
              row: startRow,
              error: `Chunk processing failed: ${chunkError.message}`,
            });
          }

          processedRecords += batchSize;
        }
      }

      this.logger.log(`Step 8: Excel processing completed`);
      this.logger.log(
        `Memory usage after Excel processing: ${JSON.stringify(process.memoryUsage())}`,
      );

      return {
        processed: processedRecords,
        successful: successfulRecords,
        errors: allErrors,
      };
    } catch (error) {
      this.logger.error('Excel streaming processing failed:', error.message);
      this.logger.error('Excel streaming error stack:', error.stack);
      throw new Error(`Excel streaming processing error: ${error.message}`);
    }
  }

  private extractExcelChunk(
    worksheet: XLSX.WorkSheet,
    range: XLSX.Range,
    startRow: number,
    endRow: number,
  ): any[][] {
    const chunk: any[][] = [];

    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
      const row: any[] = [];

      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
        const cellAddress = XLSX.utils.encode_cell({
          r: rowIndex,
          c: colIndex,
        });
        const cell = worksheet[cellAddress];

        let cellValue = '';
        if (cell) {
          if (cell.t === 'n') {
            // number
            cellValue = cell.v;
          } else if (cell.t === 's') {
            // string
            cellValue = cell.v;
          } else if (cell.t === 'd') {
            // date
            cellValue = cell.v;
          } else if (cell.w) {
            // formatted text
            cellValue = cell.w;
          } else {
            cellValue = cell.v || '';
          }
        }

        row.push(cellValue);
      }

      chunk.push(row);
    }

    return chunk;
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
    this.logger.log(`=== PROCESSING BATCH START ===`);
    this.logger.log(
      `Batch size: ${batch.length}, Starting row: ${startRowIndex}`,
    );

    const transactions = [];
    const errors: Array<{ row: number; error: string }> = [];

    this.logger.log(`Step 1: Parsing ${batch.length} rows...`);
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

    this.logger.log(
      `Step 2: Parsed ${transactions.length} valid transactions, ${errors.length} errors`,
    );

    if (transactions.length > 0) {
      try {
        this.logger.log(
          `Step 3: Sending ${transactions.length} transactions to microservice...`,
        );
        this.logger.log(
          `Transaction service call starting at ${new Date().toISOString()}`,
        );

        const result = await firstValueFrom(
          this.transactionClient
            .send('create_transactions', transactions)
            .pipe(timeout(45000)), // Increased timeout for large batches
        );

        this.logger.log(
          `Step 4: Microservice call successful! Result:`,
          result,
        );
        this.logger.log(
          `Transaction service call completed at ${new Date().toISOString()}`,
        );
      } catch (error) {
        this.logger.error(`Step 4: Microservice call FAILED!`);
        this.logger.error(`Error message: ${error.message}`);
        this.logger.error(`Error stack:`, error.stack);
        this.logger.error(`Failed at: ${new Date().toISOString()}`);
        throw error;
      }
    } else {
      this.logger.log(`Step 3: No valid transactions to send to microservice`);
    }

    this.logger.log(`=== PROCESSING BATCH END ===`);
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
      this.logger.log(
        `Processing batch ${i / batchSize + 1} (rows ${i + 1}-${i + batchSize})`,
      );
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
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('File status update timeout')), 30000); // 30 second timeout
    });

    try {
      this.logger.log(`Updating file status: ${uploadId} to ${status}`);
      this.logger.log(`Update payload:`, { status, ...updates });

      const updatePromise = this.fileProcessingService.update(
        { uploadId },
        {
          status,
          ...updates,
        },
      );

      await Promise.race([updatePromise, timeoutPromise]);
      this.logger.log(
        `File status updated successfully: ${uploadId} to ${status}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update file status: ${uploadId} to ${status}`,
        error.message,
      );
      this.logger.error(`Error stack:`, error.stack);

      this.logger.warn(
        `Continuing processing despite status update failure for ${uploadId}`,
      );
    }
  }
}
