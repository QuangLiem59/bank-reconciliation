import { BaseTransformerInterface } from '@transformers/base.interface.transformer';
import {
  EntityId,
  FilterCondition,
  FilterParams,
  FindAllResponse,
  FindOneResponse,
  ProjectionFields,
  QueryOptions,
  QueryParams,
  UpdateOpResult,
} from 'src/types/common.type';

export interface Write<T> {
  executeWithTransaction(
    callback: (session: any) => Promise<any>,
  ): Promise<any>;
  create(item: T | any, session?: any): Promise<T>;
  bulkInsert(items: T[], session?: any): Promise<T[]>;
  bulkWrite(
    operations: any[],
    session?: any,
  ): Promise<{ acknowledged: boolean; insertedCount: number }>;
  update(
    filter: object,
    item: Partial<T>,
    transformer?: BaseTransformerInterface<T, any>,
    session?: any,
    options?: object,
  ): Promise<T>;
  updateMany(
    filter: object,
    item: Partial<T>,
    options?: QueryOptions,
    update?: Record<string, any>,
    session?: any,
  ): Promise<any>;
  remove(id: EntityId, session?: any): Promise<boolean>;
  delete(id: EntityId, session?: any): Promise<boolean>;
  removeMany(filter: object, session?: any): Promise<UpdateOpResult>;
  deleteMany(filter: object, session?: any): Promise<{ deletedCount: number }>;
}

export interface Read<T> {
  findAll(
    filter?: FilterParams,
    populate?: any,
    options?: QueryOptions,
    transformer?: BaseTransformerInterface<T, any>,
    projection?: ProjectionFields<T>,
    session?: any,
  ): Promise<FindAllResponse<T>>;
  findOne(
    id: EntityId,
    populate?: any,
    transformer?: BaseTransformerInterface<T, any>,
    session?: any,
    projection?: ProjectionFields<T>,
    option?: QueryOptions,
  ): Promise<FindOneResponse<T>>;
  findOneByCondition(
    filter: FilterCondition<T>,
    populate?: any,
    transformer?: BaseTransformerInterface<T, any>,
    session?: any,
    projection?: ProjectionFields<T>,
    option?: QueryOptions,
  ): Promise<FindOneResponse<T>>;
  aggregate(
    pipeline: any[],
    queryParams: QueryParams,
    transformerClass?: new (
      populate: string[],
    ) => BaseTransformerInterface<T, any>,
    session?: any,
  ): Promise<FindOneResponse<T>>;
  exists(filter: FilterCondition<T> | object, session?: any): Promise<boolean>;
  count(filter: FilterCondition<T> | object, session?: any): Promise<number>;
}

export interface BaseServiceInterface<T> extends Write<T>, Read<T> {}
