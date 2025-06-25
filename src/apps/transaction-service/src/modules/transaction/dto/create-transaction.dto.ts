import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TRANSACTION_TYPES } from 'src/types/transaction.type';

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsString()
  user_id: string;

  @IsOptional()
  @IsString()
  upload_id?: string;

  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsEnum(TRANSACTION_TYPES)
  type: string;

  @IsOptional()
  @IsNumber()
  originalRowNumber?: number;

  @IsOptional()
  @IsString()
  fileUploadId?: string;
}
