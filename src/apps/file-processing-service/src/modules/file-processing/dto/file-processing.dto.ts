import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class ProcessFileDto {
  @IsString()
  originalname: string;

  @IsString()
  mimetype: string;

  @IsNumber()
  size: number;

  @IsString()
  buffer: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  uploadedAt: string;

  @IsOptional()
  @IsString()
  gridFsFileId?: string;
}

export class GetFileStatusDto {
  @IsString()
  uploadId: string;

  @IsString()
  userId: string;
}

export class GetUploadHistoryDto {
  @IsString()
  userId: string;
}
