import { IsIn, IsOptional } from 'class-validator';
import {
  FilterQuery,
  PopulateOptions,
  Types,
  UpdateWriteOpResult,
} from 'mongoose';

export enum SORT_TYPE {
  'DESC' = 'desc',
  'ASC' = 'acs',
}

export type UpdateOpResult = UpdateWriteOpResult;

export type FindAllResponse<T> = {
  data: T[];
  meta: MetaResponse;
};

export type FindOneResponse<T> = {
  data: T;
  meta: MetaResponse;
};

export type MetaResponse = {
  include: string[];
  custom?: any;
  pagination?: PaginateParams;
};

export type PaginateParams = {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
  links: {
    next?: string;
  };
};

export type FilterParams = {
  search?: string;
  searchJoin?: 'and' | 'or';
  searchFields?: string;
  searchDate?: string;
  searchNull?: string;
  orderBy?: string;
  sortedBy?: 'desc' | 'asc';
  additionalConditions?: object;
};

export class QueryParams {
  constructor() {
    this.page = 1;
    this.limit = 10;
  }

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  include?: string;

  @IsOptional()
  orderBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortedBy?: 'asc' | 'desc';

  @IsOptional()
  search?: string;

  @IsOptional()
  @IsIn(['and', 'or'])
  searchJoin?: 'and' | 'or';

  @IsOptional()
  searchFields?: string;

  @IsOptional()
  searchDate?: string;

  @IsOptional()
  searchNull?: string;
}

// Generic ID type to replace MongoDB's ObjectId,...
export type EntityId = any;

export type ObjectId = Types.ObjectId;

export type IncludeOptions = PopulateOptions;

export type FilterOptions<T> = FilterQuery<T>;

// Generic types for query operations
export type FilterCondition<T> = Partial<T> | Record<string, any>;
export type ProjectionFields<T> =
  | string
  | Array<keyof T>
  | Record<string, boolean | number>;
export type SortOptions = Record<string, 1 | -1 | 'asc' | 'desc'>;
export type QueryOptions = {
  sort?: SortOptions;
  limit?: number;
  skip?: number;
  populate?: any;
  [key: string]: any;
};
