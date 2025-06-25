import { BaseTransformerInterface } from '@transformers/base.interface.transformer';
import {
  ClientSession,
  ProjectionType,
  QueryOptions,
  Types,
  UpdateWriteOpResult,
} from 'mongoose';
import {
  FindAllResponse,
  FindOneResponse,
  IncludeOptions,
} from 'src/types/common.type';

export interface BaseRepositoryInterface<T> {
  executeWithTransaction(
    callback: (session: ClientSession) => Promise<any>,
  ): Promise<any>;
  create(dto: T | any, session?: ClientSession): Promise<T>;

  findOneById(
    id: Types.ObjectId | string | number | Types.ObjectId,
    populate?: IncludeOptions | (IncludeOptions | string)[],
    transformer?: BaseTransformerInterface<T, any>,
    session?: ClientSession,
    projection?: ProjectionType<T>,
    option?: QueryOptions<T>,
  ): Promise<FindOneResponse<T>>;

  findOneByCondition(
    condition?: object,
    populate?: IncludeOptions | (IncludeOptions | string)[],
    transformer?: BaseTransformerInterface<T, any>,
    session?: ClientSession,
    projection?: ProjectionType<T>,
    option?: QueryOptions<T>,
  ): Promise<FindOneResponse<T>>;

  findAll(
    condition: object,
    populate?: IncludeOptions | (IncludeOptions | string)[],
    options?: object,
    transformer?: BaseTransformerInterface<T, any>,
    projection?: ProjectionType<T>,
    session?: ClientSession,
  ): Promise<FindAllResponse<T>>;

  update(
    condition: object,
    dto: Partial<T>,
    transformer?: BaseTransformerInterface<T, any>,
    session?: ClientSession,
    options?: object,
  ): Promise<T>;

  updateMany(
    condition: object,
    dto: Partial<T>,
    options?: object,
    update?: object,
    session?: ClientSession,
  ): Promise<UpdateWriteOpResult>;

  softDelete(
    id: Types.ObjectId | string | number,
    session?: ClientSession,
  ): Promise<boolean>;

  permanentlyDelete(
    id: Types.ObjectId | string | number,
    session?: ClientSession,
  ): Promise<boolean>;

  softDeleteMany(
    condition: object,
    session?: ClientSession,
  ): Promise<UpdateWriteOpResult>;

  permanentlyDeleteMany(
    condition: object,
    session?: ClientSession,
  ): Promise<{ deletedCount: number }>;

  aggregate(pipeline: object[], session?: ClientSession): Promise<any[]>;

  exists(condition: object, session?: ClientSession): Promise<boolean>;

  count(condition: object, session?: ClientSession): Promise<number>;

  bulkWrite(operations: any[], options?: any): Promise<any>;

  bulkInsert(data: T[], session?: ClientSession): Promise<any>;
}
