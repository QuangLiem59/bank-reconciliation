import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Multer } from 'multer';

export class FileUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'CSV or Excel file containing transaction data',
  })
  file: Multer.File;

  @ApiProperty({
    description: 'Optional description for the file upload',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class FileUploadResponseDto {
  @ApiProperty({ description: 'Unique identifier for the upload' })
  uploadId: string;

  @ApiProperty({ description: 'Original filename' })
  filename: string;

  @ApiProperty({ description: 'Current processing status' })
  status: string;

  @ApiProperty({ description: 'Status message' })
  message: string;

  @ApiProperty({ description: 'Upload timestamp' })
  uploadedAt: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({ description: 'Estimated processing time' })
  estimatedProcessingTime: string;
}

export class FileStatusResponseDto {
  @ApiProperty({ description: 'Upload identifier' })
  uploadId: string;

  @ApiProperty({ description: 'Original filename' })
  filename: string;

  @ApiProperty({ description: 'Current status' })
  status: string;

  @ApiProperty({ description: 'Status message' })
  message: string;

  @ApiProperty({ description: 'Upload timestamp' })
  uploadedAt: string;

  @ApiProperty({ description: 'Processing started timestamp', required: false })
  processingStartedAt?: string;

  @ApiProperty({
    description: 'Processing completed timestamp',
    required: false,
  })
  processingCompletedAt?: string;

  @ApiProperty({ description: 'Total records processed', required: false })
  totalRecords?: number;

  @ApiProperty({
    description: 'Successfully processed records',
    required: false,
  })
  successfulRecords?: number;

  @ApiProperty({ description: 'Failed records', required: false })
  failedRecords?: number;

  @ApiProperty({ description: 'Error details if any', required: false })
  errors?: string[];

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({
    description: 'Processing progress percentage',
    required: false,
  })
  progress?: number;
}
