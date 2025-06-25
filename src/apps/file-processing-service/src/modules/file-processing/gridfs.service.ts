import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Connection } from 'mongoose';
import { Readable } from 'stream';

@Injectable()
export class GridFsService {
  private readonly logger = new Logger(GridFsService.name);
  private bucket: GridFSBucket;

  constructor(@InjectConnection() private connection: Connection) {
    this.bucket = new GridFSBucket(this.connection.db, {
      bucketName: 'transactionFiles',
    });
  }

  private calculateHash(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  async uploadFile(
    filename: string,
    buffer: unknown,
    metadata: Record<string, any>,
  ): Promise<ObjectId> {
    if (!Buffer.isBuffer(buffer)) {
      const bufferType = typeof buffer;
      const bufferConstructor = buffer?.constructor?.name || 'unknown';
      this.logger.error(
        `Invalid buffer type: ${bufferType}, constructor: ${bufferConstructor}`,
      );
      throw new Error(`Input must be a Buffer, received: ${bufferType}`);
    }

    if (buffer.length === 0) {
      throw new Error('Cannot upload empty buffer');
    }

    const originalHash = this.calculateHash(buffer);
    const originalSize = buffer.length;

    this.logger.log(`Uploading file: ${filename}`);
    this.logger.log(`Original buffer size: ${originalSize} bytes`);
    this.logger.log(`Original buffer hash: ${originalHash}`);

    return new Promise((resolve, reject) => {
      const uploadStream = this.bucket.openUploadStream(filename, {
        metadata: {
          ...metadata,
          originalHash,
          originalSize,
          uploadedAt: new Date(),
        },
      });

      uploadStream.on('finish', () => {
        this.logger.log(
          `File uploaded successfully: ${filename} (ID: ${uploadStream.id})`,
        );
        resolve(uploadStream.id);
      });

      uploadStream.on('error', (error) => {
        this.logger.error(`File upload failed: ${filename}`, error.stack);
        reject(error);
      });

      uploadStream.end(buffer);
    });
  }

  async uploadFromStream(
    filename: string,
    stream: Readable,
    metadata: Record<string, any>,
  ): Promise<ObjectId> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.bucket.openUploadStream(filename, { metadata });

      uploadStream.on('finish', () => {
        this.logger.log(`Stream uploaded successfully: ${filename}`);
        resolve(uploadStream.id);
      });

      uploadStream.on('error', (error) => {
        this.logger.error(`Stream upload failed: ${filename}`, error.stack);
        reject(error);
      });

      stream.pipe(uploadStream);
    });
  }

  async getFileStream(fileId: ObjectId) {
    try {
      return this.bucket.openDownloadStream(fileId);
    } catch (error) {
      this.logger.error(`Failed to get file stream: ${fileId}`, error.stack);
      throw error;
    }
  }

  async getFileBuffer(fileId: ObjectId): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const fileInfo = await this.getFileInfo(fileId);
        if (!fileInfo) {
          reject(new Error(`File not found: ${fileId}`));
          return;
        }

        this.logger.log(`Downloading file: ${fileId}`);
        this.logger.log(`Expected size: ${fileInfo.length} bytes`);

        if (fileInfo.metadata?.originalHash) {
          this.logger.log(`Expected hash: ${fileInfo.metadata.originalHash}`);
        }

        const chunks: Buffer[] = [];
        const downloadStream = this.bucket.openDownloadStream(fileId);

        downloadStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        downloadStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const downloadedSize = buffer.length;
          const downloadedHash = this.calculateHash(buffer);

          this.logger.log(`Downloaded buffer size: ${downloadedSize} bytes`);
          this.logger.log(`Downloaded buffer hash: ${downloadedHash}`);

          if (
            fileInfo.metadata?.originalHash &&
            fileInfo.metadata.originalHash !== downloadedHash
          ) {
            this.logger.error(`File integrity check failed for ${fileId}`);
            this.logger.error(
              `Expected hash: ${fileInfo.metadata.originalHash}`,
            );
            this.logger.error(`Actual hash: ${downloadedHash}`);
            reject(new Error(`File integrity check failed: hash mismatch`));
            return;
          }

          if (
            fileInfo.metadata?.originalSize &&
            fileInfo.metadata.originalSize !== downloadedSize
          ) {
            this.logger.error(`File size mismatch for ${fileId}`);
            this.logger.error(
              `Expected size: ${fileInfo.metadata.originalSize}`,
            );
            this.logger.error(`Actual size: ${downloadedSize}`);
            reject(new Error(`File integrity check failed: size mismatch`));
            return;
          }

          if (downloadedSize === 0) {
            reject(new Error(`Downloaded file is empty: ${fileId}`));
            return;
          }

          this.logger.log(`File integrity check passed for ${fileId}`);
          resolve(buffer);
        });

        downloadStream.on('error', (error) => {
          this.logger.error(`Download stream error: ${fileId}`, error.stack);
          reject(error);
        });
      } catch (error) {
        this.logger.error(`Failed to get file buffer: ${fileId}`, error.stack);
        reject(error);
      }
    });
  }

  async deleteFile(fileId: ObjectId): Promise<void> {
    try {
      await this.bucket.delete(fileId);
      this.logger.log(`File deleted successfully: ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${fileId}`, error.stack);
      throw error;
    }
  }

  async fileExists(fileId: ObjectId): Promise<boolean> {
    try {
      const files = await this.bucket.find({ _id: fileId }).toArray();
      return files.length > 0;
    } catch (error) {
      this.logger.error(
        `Failed to check file existence: ${fileId}`,
        error.stack,
      );
      return false;
    }
  }

  async getFileInfo(fileId: ObjectId) {
    try {
      const files = await this.bucket.find({ _id: fileId }).toArray();
      return files[0] || null;
    } catch (error) {
      this.logger.error(`Failed to get file info: ${fileId}`, error.stack);
      throw error;
    }
  }

  async compareBuffers(
    originalBuffer: Buffer,
    fileId: ObjectId,
  ): Promise<{
    match: boolean;
    originalSize: number;
    downloadedSize: number;
    originalHash: string;
    downloadedHash: string;
  }> {
    try {
      const downloadedBuffer = await this.getFileBuffer(fileId);

      const originalHash = this.calculateHash(originalBuffer);
      const downloadedHash = this.calculateHash(downloadedBuffer);

      return {
        match: originalHash === downloadedHash,
        originalSize: originalBuffer.length,
        downloadedSize: downloadedBuffer.length,
        originalHash,
        downloadedHash,
      };
    } catch (error) {
      this.logger.error(`Failed to compare buffers: ${fileId}`, error.stack);
      throw error;
    }
  }
}
