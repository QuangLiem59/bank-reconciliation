import { BaseRepositoryInterface } from '@repositories/base/base.interface.repository';
import { BaseTransformerInterface } from '@transformers/base.interface.transformer';
import { BaseEntity } from 'src/entities/shared/base/base.entity';
import { getAvailableIncludes } from 'src/helpers/parseIncludes';
import {
  buildQueryCondition,
  buildQueryOptions,
} from 'src/helpers/queryHandle';
import {
  EntityId,
  FilterParams,
  FindAllResponse,
  FindOneResponse,
  ProjectionFields,
  QueryOptions,
  QueryParams,
} from 'src/types/common.type';

import { BaseServiceInterface } from './base.interface.service';

export abstract class BaseServiceAbstract<T extends BaseEntity>
  implements BaseServiceInterface<T>
{
  constructor(private readonly repository: BaseRepositoryInterface<T>) {}

  /**
   * Execute a callback function with a transaction
   * @param callback
   */
  async executeWithTransaction(callback: (session: any) => Promise<any>) {
    return await this.repository.executeWithTransaction(callback);
  }

  /**
   * Create a new entity
   * @param create_dto
   * @param session
   */
  async create(create_dto: T | any, session?: any): Promise<T> {
    return await this.repository.create(create_dto, session);
  }

  /**
   * Bulk insert entities
   * @param items
   * @param session
   */
  async bulkInsert(items: T[], session?: any): Promise<T[]> {
    return await this.repository.bulkInsert(items, session);
  }

  /**
   * Bulk write operations
   * @param operations
   * @param session
   */
  async bulkWrite(
    operations: any[],
    session?: any,
  ): Promise<{ acknowledged: boolean; insertedCount: number }> {
    return await this.repository.bulkWrite(operations, session);
  }

  /**
   * Find all entities
   * @param filter
   * @param populate
   * @param options
   * @param transformer
   * @param projection
   * @param session
   */
  async findAll(
    filter?: FilterParams,
    populate?: any,
    options?: object,
    transformer?: BaseTransformerInterface<T, any>,
    projection?: ProjectionFields<T>,
    session?: any,
  ): Promise<FindAllResponse<T>> {
    const condition = buildQueryCondition(filter);
    const queryOptions = buildQueryOptions(filter);

    return await this.repository.findAll(
      condition,
      populate,
      { ...options, ...queryOptions },
      transformer,
      projection,
      session,
    );
  }

  /**
   * Find one entity by id
   * @param id
   * @param populate
   * @param transformer
   * @param session
   * @param projection
   * @param option
   */
  async findOne(
    id: EntityId,
    populate?: any,
    transformer?: BaseTransformerInterface<T, any>,
    session?: any,
    projection?: ProjectionFields<T>,
    option?: QueryOptions,
  ): Promise<FindOneResponse<T>> {
    return await this.repository.findOneById(
      id,
      populate,
      transformer,
      session,
      projection,
      option,
    );
  }

  /**
   * Find one entity by condition
   * @param filter
   * @param populate
   * @param transformer
   * @param session
   * @param projection
   * @param option
   */
  async findOneByCondition(
    filter: Partial<T>,
    populate?: any,
    transformer?: BaseTransformerInterface<T, any>,
    session?: any,
    projection?: ProjectionFields<T>,
    option?: QueryOptions,
  ) {
    return await this.repository.findOneByCondition(
      filter,
      populate,
      transformer,
      session,
      projection,
      option,
    );
  }

  /**
   * Update an entity
   * @param filter
   * @param update_dto
   * @param transformer
   * @param options
   * @param session
   */
  async update(
    filter: Partial<T>,
    update_dto: Partial<T>,
    transformer?: BaseTransformerInterface<T, any>,
    options?: object,
    session?: any,
  ) {
    return await this.repository.update(
      filter,
      update_dto,
      transformer,
      session,
      options,
    );
  }

  /**
   * Update many entities
   * @param filter
   * @param update_dto
   * @param options
   * @param update
   * @param session
   */
  async updateMany(
    filter: Partial<T>,
    update_dto: Partial<T>,
    options?: object,
    update?: object,
    session?: any,
  ) {
    return await this.repository.updateMany(
      filter,
      update_dto,
      options,
      update,
      session,
    );
  }

  /**
   * Remove an entity
   * @param id
   * @param session
   */
  async remove(id: EntityId, session?: any) {
    return await this.repository.softDelete(id, session);
  }

  /**
   * Permanently delete an entity
   * @param id
   * @param session
   */
  async delete(id: EntityId, session?: any) {
    return await this.repository.permanentlyDelete(id, session);
  }

  /**
   * Remove many entities
   * @param filter
   * @param session
   */
  async removeMany(filter: Partial<T>, session?: any) {
    return await this.repository.softDeleteMany(filter, session);
  }

  /**
   * Permanently delete many entities
   * @param filter
   * @param session
   */
  async deleteMany(filter: Partial<T>, session?: any) {
    return await this.repository.permanentlyDeleteMany(filter, session);
  }

  /**
   * Aggregate entities
   * @param pipeline
   * @param queryParams
   * @param transformerClass
   * @param session
   */
  async aggregate(
    pipeline: object[],
    queryParams: QueryParams,
    transformerClass?: new (
      populate: string[],
    ) => BaseTransformerInterface<T, any>,
    session?: any,
  ) {
    const { page = 1, limit = 10, include, ...filters } = queryParams;
    const skip = (page - 1) * limit;

    // Add any additional filter conditions
    if (Object.keys(filters).length) {
      const filterConditions = buildQueryCondition(filters);
      if (Object.keys(filterConditions).length) {
        pipeline.push({ $match: filterConditions });
      }
    }

    // Add facet stage for pagination and data in one query
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: parseInt(limit.toString()) }],
      },
    });

    // Process includes if needed
    const populate = include ? include.split(',') : [];

    if (populate.length) {
      // Add lookups for each populate field after pagination to improve performance
      const lookupStages = [];
      populate.forEach((field) => {
        lookupStages.push({
          $lookup: {
            from: field.toLowerCase() + 's',
            localField: field + '_id',
            foreignField: '_id',
            as: field,
          },
        });
      });

      (
        pipeline[pipeline.length - 1] as { $facet: { data: any[] } }
      ).$facet.data.push(...lookupStages);
    }

    const result = await this.repository.aggregate(pipeline, session);

    // Format the response
    const total = result[0].metadata[0]?.total || 0;
    const items = result[0].data || [];

    // Transform items if transformer is provided
    let transformedData = items;
    let availableIncludes = [];
    if (transformerClass) {
      const transformer = new transformerClass(populate);
      const includes = getAvailableIncludes(transformer, populate);
      availableIncludes = includes.availableIncludes;
      transformedData = items.map((item) => transformer.transform(item));
    }

    // Build response
    const response = {
      data: transformedData,
      meta: {
        include: availableIncludes,
        custom: [],
        pagination: {
          total,
          count: items.length,
          per_page: parseInt(limit.toString()),
          current_page: page,
          total_pages: Math.ceil(total / parseInt(limit.toString())),
          links: {},
        },
      },
    };

    return response;
  }

  /**
   * Check if an entity exists
   * @param filter
   * @param session
   */
  async exists(filter: Partial<T> | object, session?: any): Promise<boolean> {
    return await this.repository.exists(filter, session);
  }

  /**
   * Count entities
   * @param filter
   * @param session
   */
  async count(filter: Partial<T> | object, session?: any): Promise<number> {
    return await this.repository.count(filter, session);
  }
}
