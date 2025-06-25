import { BaseEntity } from '@entities/shared/base/base.entity';
import { BaseTransformerInterface } from '@transformers/base.interface.transformer';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import * as parseIncludesHelper from 'src/helpers/parseIncludes';
import { newObjectId } from 'src/helpers/stringToObjectId';

import { BaseRepositoryAbstract } from './base.abstract.repository';
class TestEntity extends BaseEntity {
  name: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}

class TestRepository extends BaseRepositoryAbstract<TestEntity> {
  constructor(model: Model<TestEntity>) {
    super(model);
  }
}

describe('BaseRepositoryAbstract', () => {
  let repository: TestRepository;
  let mockModel: any;
  let mockSession: Partial<ClientSession>;
  let testEntity: TestEntity;
  let objectId: Types.ObjectId;
  let mockTransformer: BaseTransformerInterface<TestEntity, any>;

  beforeEach(async () => {
    objectId = newObjectId();
    testEntity = {
      _id: objectId,
      name: 'Test Entity',
      description: 'Test Description',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };

    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    // Create a mock ModelConstructor function that returns a model instance
    const mockModelInstance = {
      save: jest.fn().mockResolvedValue(testEntity),
    };

    // Create the mock model as a jest mock function
    mockModel = jest.fn(() => mockModelInstance);

    // Add methods to the mockModel function
    mockModel.find = jest.fn();
    mockModel.findOne = jest.fn();
    mockModel.findById = jest.fn();
    mockModel.findByIdAndUpdate = jest.fn();
    mockModel.findByIdAndDelete = jest.fn();
    mockModel.findOneAndUpdate = jest.fn();
    mockModel.startSession = jest.fn().mockResolvedValue(mockSession);
    mockModel.updateMany = jest.fn();
    mockModel.countDocuments = jest.fn();
    mockModel.aggregate = jest.fn();
    mockModel.bulkWrite = jest.fn();

    // Mock transformer
    mockTransformer = {
      transform: jest.fn().mockImplementation((entity) => ({
        id: entity._id,
        name: entity.name,
        description: entity.description,
      })),
      getMeta: jest.fn().mockReturnValue({
        availableIncludes: ['profile', 'roles'],
        defaultIncludes: ['profile'],
      }),
    };

    // Spy on the parseIncludes helper
    jest
      .spyOn(parseIncludesHelper, 'parseIncludes')
      .mockReturnValue([{ path: 'profile' }]);

    // Create the repository with the mocked model
    repository = new TestRepository(mockModel as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeWithTransaction', () => {
    it('should start a transaction and commit it on success', async () => {
      const callbackFn = jest.fn().mockResolvedValue(testEntity);

      const result = await repository.executeWithTransaction(callbackFn);

      expect(mockModel.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(callbackFn).toHaveBeenCalledWith(mockSession);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(result).toEqual(testEntity);
    });

    it('should abort transaction on error', async () => {
      const testError = new Error('Test error');
      const callbackFn = jest.fn().mockRejectedValue(testError);

      await expect(
        repository.executeWithTransaction(callbackFn),
      ).rejects.toThrow(testError);

      expect(mockModel.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(callbackFn).toHaveBeenCalledWith(mockSession);
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create an entity with session', async () => {
      // Setup
      const saveWithSessionMock = jest.fn().mockResolvedValue(testEntity);
      const mockModelInstance = {
        save: saveWithSessionMock,
      };
      mockModel.mockReturnValue(mockModelInstance);

      // Execute
      const result = await repository.create(
        testEntity,
        mockSession as ClientSession,
      );

      // Assert
      expect(mockModel).toHaveBeenCalledWith(testEntity);
      expect(saveWithSessionMock).toHaveBeenCalledWith({
        session: mockSession,
      });
      expect(result).toEqual(testEntity);
    });

    it('should create an entity without session using transaction', async () => {
      // Setup
      const executeWithTransactionSpy = jest.spyOn(
        repository,
        'executeWithTransaction',
      );
      executeWithTransactionSpy.mockImplementation(async (callback) => {
        return callback(mockSession as ClientSession);
      });

      const saveWithSessionMock = jest.fn().mockResolvedValue(testEntity);
      const mockModelInstance = {
        save: saveWithSessionMock,
      };
      mockModel.mockReturnValue(mockModelInstance);

      // Execute
      const result = await repository.create(testEntity);

      // Assert
      expect(executeWithTransactionSpy).toHaveBeenCalled();
      expect(mockModel).toHaveBeenCalledWith(testEntity);
      expect(saveWithSessionMock).toHaveBeenCalledWith({
        session: mockSession,
      });
      expect(result).toEqual(testEntity);
    });
  });

  describe('findOneById', () => {
    it('should find an entity by id with session and transformer', async () => {
      // Setup
      const execMock = jest.fn().mockResolvedValue(testEntity);
      const sessionMock = jest.fn().mockReturnThis();
      const populateMock = jest.fn().mockReturnThis();

      mockModel.findOne = jest.fn().mockReturnValue({
        session: sessionMock,
        populate: populateMock,
        exec: execMock,
      });

      // Execute
      const result = await repository.findOneById(
        objectId,
        ['profile'],
        mockTransformer,
        mockSession as ClientSession,
      );

      // Assert
      expect(mockModel.findOne).toHaveBeenCalledWith(
        { _id: objectId, deleted_at: null },
        undefined,
        undefined,
      );
      expect(sessionMock).toHaveBeenCalledWith(mockSession);
      expect(populateMock).toHaveBeenCalledWith([
        {
          path: 'profile',
        },
      ]);
      expect(mockTransformer.transform).toHaveBeenCalledWith(testEntity);
      expect(result).toEqual({
        data: mockTransformer.transform(testEntity),
        meta: {
          include: ['profile', 'roles'],
        },
      });
    });

    it('should handle null result', async () => {
      // Setup
      const execMock = jest.fn().mockResolvedValue(null);
      const sessionMock = jest.fn().mockReturnThis();
      const populateMock = jest.fn().mockReturnThis();

      mockModel.findOne = jest.fn().mockReturnValue({
        session: sessionMock,
        populate: populateMock,
        exec: execMock,
      });

      // Execute
      const result = await repository.findOneById(
        objectId,
        ['profile'],
        mockTransformer,
      );

      // Assert
      expect(result).toEqual({
        data: null,
        meta: {
          include: ['profile', 'roles'],
        },
      });
    });
  });

  describe('findOneByCondition', () => {
    it('should find an entity by condition with session and transformer', async () => {
      // Setup
      const condition = { name: 'Test Entity' };
      const execMock = jest.fn().mockResolvedValue(testEntity);
      const sessionMock = jest.fn().mockReturnThis();
      const populateMock = jest.fn().mockReturnThis();

      mockModel.findOne = jest.fn().mockReturnValue({
        session: sessionMock,
        populate: populateMock,
        exec: execMock,
      });

      // Execute
      const result = await repository.findOneByCondition(
        condition,
        ['profile'],
        mockTransformer,
        mockSession as ClientSession,
      );

      // Assert
      expect(mockModel.findOne).toHaveBeenCalledWith(
        { ...condition, deleted_at: null },
        undefined,
        undefined,
      );
      expect(sessionMock).toHaveBeenCalledWith(mockSession);
      expect(populateMock).toHaveBeenCalledWith([
        {
          path: 'profile',
        },
      ]);
      expect(mockTransformer.transform).toHaveBeenCalledWith(testEntity);
      expect(result).toEqual({
        data: mockTransformer.transform(testEntity),
        meta: {
          include: ['profile', 'roles'],
        },
      });
    });
  });

  describe('update', () => {
    it('should update an entity with session', async () => {
      // Setup
      const condition = { _id: objectId };
      const updateData = { name: 'Updated Name' };
      const transformedEntity = { ...testEntity, name: 'Updated Name' };

      mockModel.findOneAndUpdate = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(transformedEntity),
      });

      // Execute
      const result = await repository.update(
        condition as FilterQuery<TestEntity>,
        updateData,
        mockTransformer,
        mockSession as ClientSession,
      );

      // Assert
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { deleted_at: null, ...condition },
        { $set: updateData },
        { new: true, session: mockSession },
      );
      expect(mockTransformer.transform).toHaveBeenCalledWith(transformedEntity);
      expect(result).toEqual(mockTransformer.transform(transformedEntity));
    });

    it('should update an entity without session using transaction', async () => {
      // Setup
      const condition = { _id: objectId };
      const updateData = { name: 'Updated Name' };
      const transformedEntity = { ...testEntity, name: 'Updated Name' };

      mockModel.findOneAndUpdate = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(transformedEntity),
      });

      const executeWithTransactionSpy = jest.spyOn(
        repository,
        'executeWithTransaction',
      );
      executeWithTransactionSpy.mockImplementation(async (callback) => {
        return callback(mockSession as ClientSession);
      });

      // Execute
      const result = await repository.update(
        condition as FilterQuery<TestEntity>,
        updateData,
        mockTransformer,
      );

      // Assert
      expect(executeWithTransactionSpy).toHaveBeenCalled();
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { deleted_at: null, ...condition },
        { $set: updateData },
        { new: true, session: mockSession },
      );
      expect(result).toEqual(mockTransformer.transform(transformedEntity));
    });

    it('should throw error if document not found for update', async () => {
      // Setup
      const condition = { _id: objectId };
      const updateData = { name: 'Updated Name' };

      mockModel.findOneAndUpdate = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      // Execute & Assert
      await expect(
        repository.update(
          condition as FilterQuery<TestEntity>,
          updateData,
          null,
          mockSession as ClientSession,
        ),
      ).rejects.toThrow('Document not found for update.');
    });
  });

  describe('updateMany', () => {
    it('should update multiple entities with session', async () => {
      // Setup
      const condition = { name: 'Test Entity' };
      const updateData = { description: 'Updated Description' };
      const updateResult = { matchedCount: 2, modifiedCount: 2 };

      const sessionMock = jest.fn().mockReturnValue(updateResult);
      mockModel.updateMany = jest.fn().mockReturnValue({
        session: sessionMock,
      });

      // Execute
      const result = await repository.updateMany(
        condition,
        updateData,
        {},
        undefined,
        mockSession as ClientSession,
      );

      // Assert
      expect(mockModel.updateMany).toHaveBeenCalledWith(
        { deleted_at: null, ...condition },
        { $set: updateData },
        {},
      );
      expect(sessionMock).toHaveBeenCalledWith(mockSession);
      expect(result).toEqual(updateResult);
    });

    it('should update multiple entities without session using transaction', async () => {
      // Setup
      const condition = { name: 'Test Entity' };
      const updateData = { description: 'Updated Description' };
      const updateResult = { matchedCount: 2, modifiedCount: 2 };

      const sessionMock = jest.fn().mockReturnValue(updateResult);
      mockModel.updateMany = jest.fn().mockReturnValue({
        session: sessionMock,
      });

      const executeWithTransactionSpy = jest.spyOn(
        repository,
        'executeWithTransaction',
      );
      executeWithTransactionSpy.mockImplementation(async (callback) => {
        return callback(mockSession as ClientSession);
      });

      // Execute
      const result = await repository.updateMany(condition, updateData);

      // Assert
      expect(executeWithTransactionSpy).toHaveBeenCalled();
      expect(mockModel.updateMany).toHaveBeenCalledWith(
        { deleted_at: null, ...condition },
        { $set: updateData },
        undefined,
      );
      expect(result).toEqual(updateResult);
    });

    it('should use custom update object if provided', async () => {
      // Setup
      const condition = { name: 'Test Entity' };
      const updateData = { description: 'Updated Description' };
      const customUpdate = { $inc: { counter: 1 } };
      const updateResult = { matchedCount: 2, modifiedCount: 2 };

      const sessionMock = jest.fn().mockReturnValue(updateResult);
      mockModel.updateMany = jest.fn().mockReturnValue({
        session: sessionMock,
      });

      // Execute
      await repository.updateMany(
        condition,
        updateData,
        {},
        customUpdate,
        mockSession as ClientSession,
      );

      // Assert
      expect(mockModel.updateMany).toHaveBeenCalledWith(
        { deleted_at: null, ...condition },
        customUpdate,
        {},
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete an entity with session', async () => {
      // Setup
      mockModel.findById = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(testEntity),
      });

      mockModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(true),
      });

      // Execute
      const result = await repository.softDelete(
        objectId,
        mockSession as ClientSession,
      );

      // Assert
      expect(mockModel.findById).toHaveBeenCalledWith(objectId);
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        objectId,
        { deleted_at: expect.any(Date) },
        { session: mockSession },
      );
      expect(result).toBe(true);
    });

    it('should return false if entity not found for soft delete', async () => {
      // Setup
      mockModel.findById = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      // Execute
      const result = await repository.softDelete(
        objectId,
        mockSession as ClientSession,
      );

      // Assert
      expect(result).toBe(false);
      expect(mockModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('permanentlyDelete', () => {
    it('should permanently delete an entity with session', async () => {
      // Setup
      mockModel.findById = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(testEntity),
      });

      const sessionMock = jest.fn().mockReturnThis();
      mockModel.findByIdAndDelete = jest.fn().mockReturnValue({
        session: sessionMock,
      });

      // Execute
      const result = await repository.permanentlyDelete(
        objectId,
        mockSession as ClientSession,
      );

      // Assert
      expect(mockModel.findById).toHaveBeenCalledWith(objectId);
      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith(objectId);
      expect(sessionMock).toHaveBeenCalledWith(mockSession);
      expect(result).toBe(true);
    });

    it('should return false if entity not found for permanent delete', async () => {
      // Setup
      mockModel.findById = jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      // Execute
      const result = await repository.permanentlyDelete(
        objectId,
        mockSession as ClientSession,
      );

      // Assert
      expect(result).toBe(false);
      expect(mockModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should find all entities by condition with pagination', async () => {
      // Setup
      const condition = { name: 'Test Entity' };
      const entities = [
        testEntity,
        {
          ...testEntity,
          _id: newObjectId(),
          name: 'Test Entity 2',
        },
      ];

      jest.spyOn(parseIncludesHelper, 'getAvailableIncludes').mockReturnValue({
        availableIncludes: ['profile', 'roles'],
        includes: ['profile'],
      });

      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(entities);

      mockModel.find = jest.fn().mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      // Fix: Create proper mock for countDocuments to return a promise
      mockModel.countDocuments = jest.fn().mockImplementation(() => {
        return {
          session: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(10),
        };
      });

      // Execute
      const result = await repository.findAll(
        condition,
        ['profile'],
        { skip: 0, limit: 10 },
        mockTransformer,
        undefined,
        mockSession as ClientSession,
      );

      // Assert
      expect(mockModel.find).toHaveBeenCalledWith(
        { ...condition, deleted_at: null },
        undefined,
        { skip: 0, limit: 10, session: mockSession },
      );
      expect(mockModel.countDocuments).toHaveBeenCalledWith(
        {
          ...condition,
          deleted_at: null,
        },
        { session: mockSession },
      );
      expect(mockTransformer.transform).toHaveBeenCalledTimes(2);
      expect(result.data.length).toBe(2);
      expect(result.meta.pagination.total).toBe(10);
      expect(result.meta.pagination.per_page).toBe(10);
      expect(result.meta.pagination.current_page).toBe(1);
    });
  });

  describe('aggregate', () => {
    it('should perform aggregation with session', async () => {
      // Setup
      const pipeline = [{ $match: { name: 'Test Entity' } }];
      const aggregationResult = [{ _id: objectId, count: 5 }];

      const sessionMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(aggregationResult);

      mockModel.aggregate = jest.fn().mockReturnValue({
        session: sessionMock,
        exec: execMock,
      });

      // Execute
      const result = await repository.aggregate(
        pipeline,
        mockSession as ClientSession,
      );

      // Assert
      expect(mockModel.aggregate).toHaveBeenCalledWith(pipeline);
      expect(sessionMock).toHaveBeenCalledWith(mockSession);
      expect(result).toEqual(aggregationResult);
    });
  });

  describe('exists', () => {
    it('should check if entity exists with session', async () => {
      // Setup
      const condition = { name: 'Test Entity' };

      const sessionMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(testEntity);

      mockModel.findOne = jest.fn().mockReturnValue({
        session: sessionMock,
        exec: execMock,
      });

      // Execute
      const result = await repository.exists(
        condition,
        mockSession as ClientSession,
      );

      // Assert
      expect(mockModel.findOne).toHaveBeenCalledWith(
        { deleted_at: null, ...condition },
        { _id: 1 },
      );
      expect(sessionMock).toHaveBeenCalledWith(mockSession);
      expect(result).toBe(true);
    });

    it('should return false if entity does not exist', async () => {
      // Setup
      const condition = { name: 'Non-existent Entity' };

      const sessionMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(null);

      mockModel.findOne = jest.fn().mockReturnValue({
        session: sessionMock,
        exec: execMock,
      });

      // Execute
      const result = await repository.exists(
        condition,
        mockSession as ClientSession,
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count entities by condition with session', async () => {
      // Setup
      const condition = { name: 'Test Entity' };

      // Fix: Properly mock countDocuments with session
      const sessionMock = jest.fn().mockReturnThis();
      mockModel.countDocuments = jest.fn().mockImplementation(() => {
        return {
          session: sessionMock,
          exec: jest.fn().mockResolvedValue(5),
        };
      });

      // Execute
      const result = await repository.count(
        condition,
        mockSession as ClientSession,
      );

      // Assert
      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        deleted_at: null,
        ...condition,
      });
      expect(sessionMock).toHaveBeenCalledWith(mockSession);
      expect(result).toBe(5);
    });
  });

  describe('bulkWrite', () => {
    it('should perform bulk write operations', async () => {
      // Setup
      const operations = [
        {
          updateOne: {
            filter: { _id: objectId },
            update: { $set: { name: 'Updated Name' } },
          },
        },
      ];
      const bulkWriteResult = { ok: 1, nModified: 1 };

      mockModel.bulkWrite = jest.fn().mockResolvedValue(bulkWriteResult);

      // Execute
      const result = await repository.bulkWrite(operations);

      // Assert
      expect(mockModel.bulkWrite).toHaveBeenCalledWith(operations, undefined);
      expect(result).toEqual(bulkWriteResult);
    });

    it('should perform bulk write operations with options', async () => {
      // Setup
      const operations = [
        {
          updateOne: {
            filter: { _id: objectId },
            update: { $set: { name: 'Updated Name' } },
          },
        },
      ];
      const options = { ordered: false };
      const bulkWriteResult = { ok: 1, nModified: 1 };

      mockModel.bulkWrite = jest.fn().mockResolvedValue(bulkWriteResult);

      // Execute
      const result = await repository.bulkWrite(operations, options);

      // Assert
      expect(mockModel.bulkWrite).toHaveBeenCalledWith(operations, options);
      expect(result).toEqual(bulkWriteResult);
    });
  });
});
