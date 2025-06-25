import { BaseTransformerInterface } from '@transformers/base.interface.transformer';
import {
  ClientSession,
  FilterQuery,
  HydrateOptions,
  Model,
  ProjectionType,
  QueryOptions,
  Types,
  UpdateWriteOpResult,
} from 'mongoose';
import { BaseEntity } from 'src/entities/shared/base/base.entity';
import { getAvailableIncludes, parseIncludes } from 'src/helpers/parseIncludes';
import {
  FindAllResponse,
  FindOneResponse,
  IncludeOptions,
} from 'src/types/common.type';

import { BaseRepositoryInterface } from './base.interface.repository';

export abstract class BaseRepositoryAbstract<T extends BaseEntity>
  implements BaseRepositoryInterface<T>
{
  protected constructor(private readonly model: Model<T>) {
    this.model = model;
  }

  /**
   * Execute operation with transaction
   * @param callback Function that executes within the transaction
   * @returns Result of the callback
   */
  async executeWithTransaction<R>(
    callback: (session: ClientSession) => Promise<R>,
  ): Promise<R> {
    const session = await this.model.startSession();
    session.startTransaction();

    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Create a new document with transaction
   * @param dto Data to create document
   * @param session Optional MongoDB session for transaction
   * @returns Created document
   */
  async create(dto: T | any, session?: ClientSession): Promise<T> {
    const newEntity = new this.model(dto);

    if (session) {
      return await newEntity.save({ session });
    } else {
      return this.executeWithTransaction(async (session) => {
        return await newEntity.save({ session });
      });
    }
  }

  /**
   * Find one document by ID
   * @param id Document ID
   * @param populate Optional populate options
   * @param transformer Optional transformer
   * @param session Optional MongoDB session for transaction
   * @param projection Fields to include
   * @param option Optional query options
   * @returns Found document
   */
  async findOneById(
    id: Types.ObjectId | string | Types.ObjectId,
    populate?: IncludeOptions | (IncludeOptions | string)[],
    transformer?: BaseTransformerInterface<T, any>,
    session?: ClientSession,
    projection?: ProjectionType<T>,
    option?: QueryOptions<T>,
  ): Promise<FindOneResponse<T>> {
    const query = this.model.findOne(
      { _id: id, deleted_at: null },
      projection,
      option,
    );

    // Use session if provided
    if (session) {
      query.session(session);
    }

    // Get available includes and includes
    const availableIncludes = Array.from(
      new Set([
        ...(transformer?.getMeta().availableIncludes || []),
        ...(transformer?.getMeta().defaultIncludes || []),
      ]),
    );
    let includes = Array.isArray(populate) ? populate : [populate];
    includes = Array.from(
      new Set([...includes, ...(transformer?.getMeta().defaultIncludes || [])]),
    );
    includes = includes.filter((include: string) => !!include);
    includes = includes.map((include: string) => include.trim());

    if (availableIncludes.length) {
      includes = includes.filter((include: string) =>
        availableIncludes.includes(include.split('.')[0] as string),
      );
    }
    if (includes.length) {
      query.populate(parseIncludes(includes as string[]));
    }

    // Execute query
    const result = await query.exec();

    // Return response
    return {
      data: result
        ? transformer
          ? await transformer.transform(result)
          : result
        : null,
      meta: {
        include: availableIncludes,
      },
    };
  }

  /**
   * Find one document by condition
   * @param condition Filter query
   * @param populate Optional populate options
   * @param transformer Optional transformer
   * @param session Optional MongoDB session for transaction
   * @param projection Fields to include
   * @param option Optional query options
   * @returns Found document
   */
  async findOneByCondition(
    condition = {},
    populate?: IncludeOptions | (IncludeOptions | string)[],
    transformer?: BaseTransformerInterface<T, any>,
    session?: ClientSession,
    projection?: ProjectionType<T>,
    option?: QueryOptions<T>,
  ): Promise<FindOneResponse<T>> {
    const query = this.model.findOne(
      {
        ...condition,
        deleted_at: null,
      },
      projection,
      option,
    );

    // Use session if provided
    if (session) {
      query.session(session);
    }

    // Get available includes and includes
    const availableIncludes = Array.from(
      new Set([
        ...(transformer?.getMeta().availableIncludes || []),
        ...(transformer?.getMeta().defaultIncludes || []),
      ]),
    );

    let includes = Array.isArray(populate) ? populate : [populate];
    includes = Array.from(
      new Set([...includes, ...(transformer?.getMeta().defaultIncludes || [])]),
    );
    includes = includes.filter((include: string) => !!include);
    includes = includes.map((include: string) => include.trim());

    if (availableIncludes.length) {
      includes = includes.filter((include: string) =>
        availableIncludes.includes(include.split('.')[0] as string),
      );
    }
    if (includes.length) {
      query.populate(parseIncludes(includes as string[]));
    }

    // Execute query
    const result = await query.exec();

    // Return response
    return {
      data: result
        ? transformer
          ? await transformer.transform(result)
          : result
        : null,
      meta: {
        include: availableIncludes,
      },
    };
  }

  /**
   * Find all documents by condition
   * @param condition Filter query
   * @param populate Optional populate options
   * @param options Query options
   * @param projection Fields to include
   * @param transformer Optional transformer
   * @param session Optional MongoDB session for transaction
   * @returns Found documents
   */
  async findAll(
    condition: FilterQuery<T>,
    populate?: IncludeOptions | (IncludeOptions | string)[],
    options?: QueryOptions<T>,
    transformer?: BaseTransformerInterface<T, any>,
    projection?: ProjectionType<T>,
    session?: ClientSession,
  ): Promise<FindAllResponse<T>> {
    if (!options) {
      options = {};
    }
    if (options?.limit !== 0) {
      options.skip = +options?.skip || 0;
      options.limit = +options?.limit || 10;
    }
    const currentPage = Math.floor(options.skip / options.limit) + 1;

    const query = this.model.find(
      { ...condition, deleted_at: null },
      projection,
      { ...options, ...(session ? { session } : {}) },
    );

    // Use session if provided
    // if (session) {
    //   query.session(session);
    // }

    // Get available includes and includes
    const includes = getAvailableIncludes(transformer, populate);
    if (includes.includes.length) {
      query.populate(parseIncludes(includes.includes));
    }

    const [count, items] = await Promise.all([
      this.model
        .countDocuments(
          { ...condition, deleted_at: null },
          { ...(session ? { session } : {}) },
        )
        .exec(),
      query.exec(),
    ]);
    const total = count;
    const perPage = +options.limit;
    const totalPages = Math.ceil(total / perPage);
    const currentCount = items.length;

    const pagination = {
      total,
      count: currentCount,
      per_page: perPage,
      current_page: currentPage,
      total_pages: totalPages,
      links: {} as { next?: string },
    };

    const transformedData = transformer
      ? await Promise.all(
          items.map(async (item) => await transformer.transform(item)),
        )
      : items;

    return {
      data: transformedData,
      meta: {
        include: includes.availableIncludes,
        custom: [],
        pagination: {
          ...pagination,
          links: {},
        },
      },
    };
  }

  /**
   * Update document with transaction
   * @param condition Filter query
   * @param dto Data to update
   * @param transformer Optional transformer
   * @param session Optional MongoDB session for transaction
   * @param options Query options
   * @returns Updated document
   */
  async update(
    condition: FilterQuery<T>,
    dto: Partial<T>,
    transformer?: BaseTransformerInterface<T, any>,
    session?: ClientSession,
    options?: QueryOptions<T>,
  ): Promise<T> {
    const updateOperation = async (session?: ClientSession) => {
      const updatedData = await this.model
        .findOneAndUpdate(
          { deleted_at: null, ...condition },
          { $set: dto },
          { new: true, session, ...options },
        )
        .exec();

      if (!updatedData) {
        throw new Error('Document not found for update.');
      }

      return transformer
        ? await transformer.transform(updatedData)
        : updatedData;
    };

    if (session) {
      return updateOperation(session);
    } else {
      return this.executeWithTransaction(updateOperation);
    }
  }

  /**
   * Update multiple documents with transaction
   * @param condition Filter query
   * @param dto Data to update
   * @param options Hydrate options
   * @param update Optional update object
   * @param session Optional MongoDB session for transaction
   * @returns Result of update operation
   */
  async updateMany(
    condition: FilterQuery<T>,
    dto: Partial<T>,
    options?: HydrateOptions,
    update?: object,
    session?: ClientSession,
  ): Promise<UpdateWriteOpResult> {
    if (session) {
      const updateData = update || { $set: dto };
      return this.model
        .updateMany({ deleted_at: null, ...condition }, updateData, options)
        .session(session);
    } else {
      return this.executeWithTransaction(async (session) => {
        const updateData = update || { $set: dto };
        return this.model
          .updateMany({ deleted_at: null, ...condition }, updateData, options)
          .session(session);
      });
    }
  }

  /**
   * Soft delete a document by setting deleted_at field
   * @param id Document ID
   * @param session Optional MongoDB session for transaction
   * @returns Boolean indicating success
   */
  async softDelete(
    id: Types.ObjectId | Types.ObjectId,
    session?: ClientSession,
  ): Promise<boolean> {
    const entity = await this.model.findById(id).exec();

    if (!entity) {
      return false;
    }

    if (session) {
      await this.model
        .findByIdAndUpdate(id, { deleted_at: new Date() }, { session })
        .exec();
      return true;
    } else {
      return this.executeWithTransaction(async (session) => {
        await this.model
          .findByIdAndUpdate(id, { deleted_at: new Date() }, { session })
          .exec();
        return true;
      });
    }
  }

  /**
   * Permanently delete a document from the database
   * @param id Document ID
   * @param session Optional MongoDB session for transaction
   * @returns Boolean indicating success
   */
  async permanentlyDelete(
    id: Types.ObjectId | Types.ObjectId,
    session?: ClientSession,
  ): Promise<boolean> {
    const entity = await this.model.findById(id).exec();

    if (!entity) {
      return false;
    }

    if (session) {
      await this.model.findByIdAndDelete(id).session(session);
      return true;
    } else {
      return this.executeWithTransaction(async (session) => {
        await this.model.findByIdAndDelete(id).session(session);
        return true;
      });
    }
  }

  /**
   * Soft delete multiple documents by setting deleted_at field
   * @param condition Filter query
   * @param session Optional MongoDB session for transaction
   * @returns Result of update operation
   */
  async softDeleteMany(
    condition: FilterQuery<T>,
    session?: ClientSession,
  ): Promise<UpdateWriteOpResult> {
    const updateData = { $set: { deleted_at: new Date() } };

    if (session) {
      return this.model
        .updateMany({ ...condition }, updateData)
        .session(session);
    } else {
      return this.executeWithTransaction(async (session) => {
        return this.model
          .updateMany({ ...condition }, updateData)
          .session(session);
      });
    }
  }

  /**
   * Permanently delete multiple documents
   * @param condition Filter query
   * @param session Optional MongoDB session for transaction
   * @returns Result of delete operation
   */
  async permanentlyDeleteMany(
    condition: FilterQuery<T>,
    session?: ClientSession,
  ): Promise<{ deletedCount: number }> {
    const query = this.model.deleteMany(condition);

    if (session) {
      query.session(session);
    }

    return query.exec();
  }

  /**
   * Aggregate documents
   * @param pipeline Aggregation pipeline
   * @param session Optional MongoDB session for transaction
   * @returns Aggregation result
   * @throws Error if aggregation fails
   */
  async aggregate(pipeline: any[], session?: ClientSession): Promise<any[]> {
    const query = this.model.aggregate(pipeline);

    if (session) {
      query.session(session);
    }

    return query.exec();
  }

  /**
   * Check if document exists
   * @param condition Filter query
   * @param session Optional MongoDB session for transaction
   * @returns True if document exists
   */
  async exists(
    condition: Partial<T> | object,
    session?: ClientSession,
  ): Promise<boolean> {
    const query = this.model.findOne(
      { deleted_at: null, ...condition },
      { _id: 1 },
    );

    if (session) {
      query.session(session);
    }

    const result = await query.exec();
    return !!result;
  }

  /**
   * Count documents by condition
   * @param condition Filter query
   * @param session Optional MongoDB session for transaction
   * @returns Number of documents
   * @throws Error if query fails
   */
  async count(
    condition: Partial<T> | object,
    session?: ClientSession,
  ): Promise<number> {
    const finalCondition = { deleted_at: null, ...condition };

    let query = this.model.countDocuments(finalCondition);

    if (session) {
      query = query.session(session);
    }

    return await query.exec();
  }

  /**
   * Bulk write operations
   * @param operations Bulk write operations
   * @param options Bulk write options
   * @returns Bulk write result
   * @throws Error if bulk write fails
   */
  async bulkWrite(operations: any[], options?: any): Promise<any> {
    return this.model.bulkWrite(operations, options);
  }

  /**
   * Bulk insert documents
   * @param documents Documents to insert
   * @param session Optional MongoDB session for transaction
   * @returns Inserted documents
   * @throws Error if bulk insert fails
   */
  async bulkInsert(documents: T[], session?: ClientSession): Promise<T[]> {
    if (session) {
      return this.model.insertMany(documents, { session });
    } else {
      return this.executeWithTransaction(async (session) => {
        return this.model.insertMany(documents, { session });
      });
    }
  }
}
