import { Transaction } from '@entities/transaction.entity';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/apps/api-gateway/src/modules/auth/jwt-auth.guard';
import { ApiDocsPagination } from 'src/decorators/swagger.decorator';
import { QueryParams } from 'src/types/common.type';

import { CreateTransactionDto } from './dto/transaction.dto';
import { TransactionService } from './transaction.service';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  /**
   * Get paginated transactions with filters
   */
  @Get()
  @ApiOperation({ summary: 'Get paginated transactions with filters' })
  @ApiDocsPagination(Transaction.name)
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  async getTransactions(@Req() request: Request, @Query() filter: QueryParams) {
    const user = request.user.data;
    return this.transactionService.getTransactions(filter, user.id);
  }

  /**
   * Get a single transaction by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@Req() request: Request, @Param('id') id: string) {
    const user = request.user.data;
    return this.transactionService.getTransaction(id, user.id);
  }

  /**
   * Create a new transaction manually
   */
  @Post()
  @ApiOperation({ summary: 'Create a new transaction manually' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async createTransaction(
    @Req() request: Request,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    const user = request.user.data;
    return this.transactionService.createTransaction(
      createTransactionDto,
      user.id,
    );
  }

  /**
   * Delete a transaction by ID
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction deleted successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async deleteTransaction(@Req() request: Request, @Param('id') id: string) {
    const user = request.user.data;
    return this.transactionService.deleteTransaction(id, user.id);
  }
}
