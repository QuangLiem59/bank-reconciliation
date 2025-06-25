import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  PayloadTooLargeException,
  Post,
  Req,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { Multer } from 'multer';
import { JwtAuthGuard } from 'src/apps/api-gateway/src/modules/auth/jwt-auth.guard';
import { Permissions } from 'src/apps/api-gateway/src/modules/auth/permissions.decorator';
import { PermissionsGuard } from 'src/apps/api-gateway/src/modules/auth/permissions.guard';

import { multerConfig } from './config/multer.config';
import {
  FileStatusResponseDto,
  FileUploadDto,
  FileUploadResponseDto,
} from './dto/file-upload.dto';
import { FileUploadService } from './file-upload.service';

@ApiTags('File Processing')
@Controller('file-uploads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  /* Upload transaction file */
  @Post('transactions')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({
    summary: 'Upload transaction file',
    description:
      'Upload CSV or Excel file containing transaction data for processing',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Transaction file upload',
    type: FileUploadDto,
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully and processing started',
    type: FileUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid file format or missing file',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 413,
    description: 'Payload too large - File size exceeds limit',
  })
  @ApiResponse({
    status: 415,
    description: 'Unsupported media type - Invalid file type',
  })
  @HttpCode(HttpStatus.CREATED)
  @Permissions('upload_transaction_file')
  async uploadTransactionFile(
    @UploadedFile() file: Multer.File,
    @Body() fileUploadDto: FileUploadDto,
    @Req() req: ExpressRequest,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        'Invalid file type. Only CSV and Excel files are allowed.',
      );
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new PayloadTooLargeException('File size exceeds 100MB limit');
    }

    try {
      const user = req.user;
      const result = await this.fileUploadService.uploadTransactionFile(
        file,
        user.data.id,
        fileUploadDto.description || '',
      );

      return result;
    } catch (error) {
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  /* Get file upload status */
  @Get('status/:uploadId')
  @ApiOperation({
    summary: 'Get file upload status',
    description: 'Retrieve the processing status of an uploaded file',
  })
  @ApiResponse({
    status: 200,
    description: 'File status retrieved successfully',
    type: FileStatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Upload not found',
  })
  @Permissions('get_upload_status')
  async getFileUploadStatus(
    @Param('uploadId') uploadId: string,
    @Req() req: ExpressRequest,
  ): Promise<FileStatusResponseDto> {
    return this.fileUploadService.getFileUploadStatus(
      uploadId,
      req.user.data.id,
    );
  }

  /* Get upload history */
  @Get('history')
  @ApiOperation({
    summary: 'Get upload history',
    description: 'Retrieve upload history for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Upload history retrieved successfully',
    type: [FileStatusResponseDto],
  })
  @Permissions('get_upload_history')
  async getUploadHistory(
    @Req() req: ExpressRequest,
  ): Promise<FileStatusResponseDto[]> {
    return this.fileUploadService.getUploadHistory(req.user.data.id);
  }
}
