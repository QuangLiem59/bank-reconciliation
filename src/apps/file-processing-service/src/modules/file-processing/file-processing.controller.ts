import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import {
  GetFileStatusDto,
  GetUploadHistoryDto,
  ProcessFileDto,
} from './dto/file-processing.dto';
import { FileProcessingService } from './file-processing.service';

@Controller()
export class FileProcessingController {
  private readonly logger = new Logger(FileProcessingController.name);

  constructor(private readonly fileProcessingService: FileProcessingService) {}

  @MessagePattern('process_transaction_file')
  async processTransactionFile(@Payload() data: ProcessFileDto) {
    this.logger.log(
      `Received file processing request for user: ${data.userId}`,
    );
    return this.fileProcessingService.processTransactionFile(data);
  }

  @MessagePattern('get_file_status')
  async getFileStatus(@Payload() data: GetFileStatusDto) {
    this.logger.log(`Getting file status for upload: ${data.uploadId}`);
    return this.fileProcessingService.getFileStatus(data.uploadId, data.userId);
  }

  @MessagePattern('get_upload_history')
  async getUploadHistory(@Payload() data: GetUploadHistoryDto) {
    this.logger.log(`Getting upload history for user: ${data.userId}`);
    return this.fileProcessingService.getUploadHistory(data.userId);
  }
}
