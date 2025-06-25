import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TRANSACTION_TYPES } from 'src/types/transaction.type';

export class CreateTransactionDto {
  @ApiProperty({ example: '2024-03-21T10:20:11.000Z' })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty({ example: 'Manual deposit transaction' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: 150.75 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ enum: TRANSACTION_TYPES, example: TRANSACTION_TYPES.DEPOSIT })
  @IsEnum(TRANSACTION_TYPES)
  type: string;
}

export class BulkCreateTransactionDto {
  @ApiProperty({
    type: [CreateTransactionDto],
    description: 'Array of transactions to create',
    example: [
      {
        date: '2024-03-21T10:20:11.000Z',
        content: 'Bulk transaction 1',
        amount: 100.0,
        type: 'Deposit',
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionDto)
  transactions: CreateTransactionDto[];
}

export class UpdateTransactionDto {
  @ApiProperty({ example: '2024-03-21T10:20:11.000Z', required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @ApiProperty({ example: 'Updated transaction description', required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ example: 200.0, required: false })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({ enum: TRANSACTION_TYPES, required: false })
  @IsEnum(TRANSACTION_TYPES)
  @IsOptional()
  type?: string;
}
