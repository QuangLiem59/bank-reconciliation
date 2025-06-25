import { Test } from '@nestjs/testing';
import { BaseRepositoryInterface } from '@repositories/base/base.interface.repository';
import { BaseTransformerInterface } from '@transformers/base.interface.transformer';
import { BaseEntity } from 'src/entities/shared/base/base.entity';
import { newObjectId, stringToObjectId } from 'src/helpers/stringToObjectId';

import { BaseServiceAbstract } from './base.abstract.service';
class TestEntity extends BaseEntity {
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}
class TestTransformer implements BaseTransformerInterface<TestEntity, any> {
  readonly defaultIncludes: string[] = [];
  readonly availableIncludes: string[] = ['related'];

  constructor(private include: string[] = []) {}

  transform(item: TestEntity): any {
    return {
      id: item._id,
      name: item.name,
      email: item.email,
      transformed: true,
    };
  }

  getMeta(): { availableIncludes: string[]; defaultIncludes: string[] } {
    return {
      availableIncludes: this.availableIncludes,
      defaultIncludes: this.defaultIncludes,
    };
  }
}

class TestService extends BaseServiceAbstract<TestEntity> {
  constructor(repository: BaseRepositoryInterface<TestEntity>) {
    super(repository);
  }
}

describe('BaseServiceAbstract', () => {
  let service: TestService;
  let repository: BaseRepositoryInterface<TestEntity>;

  // Mock data
  const testEntityId = newObjectId();
  const testEntity: TestEntity = {
    _id: testEntityId,
    name: 'Test Name',
    email: 'test@example.com',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };

  const mockSession = { id: 'mockSession' };

  beforeEach(async () => {
    const mockRepository: Partial<BaseRepositoryInterface<TestEntity>> = {
      executeWithTransaction: jest
        .fn()
        .mockImplementation((callback) => callback(mockSession)),
      create: jest.fn().mockResolvedValue(testEntity),
      findAll: jest.fn().mockResolvedValue({
        data: [testEntity],
        meta: {
          pagination: {
            total: 1,
            count: 1,
            per_page: 10,
            current_page: 1,
            total_pages: 1,
          },
          include: [],
          custom: [],
        },
      }),
      findOneById: jest.fn().mockResolvedValue({
        data: testEntity,
        meta: {
          include: [],
          custom: [],
        },
      }),
      findOneByCondition: jest.fn().mockResolvedValue({
        data: testEntity,
        meta: {
          include: [],
          custom: [],
        },
      }),
      update: jest.fn().mockResolvedValue(testEntity),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
      softDelete: jest.fn().mockResolvedValue(true),
      permanentlyDelete: jest.fn().mockResolvedValue(true),
      aggregate: jest.fn().mockResolvedValue([
        {
          metadata: [{ total: 1 }],
          data: [testEntity],
        },
      ]),
      exists: jest.fn().mockResolvedValue(true),
      count: jest.fn().mockResolvedValue(1),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TestService,
        {
          provide: 'BaseRepositoryInterface',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = moduleRef.get<TestService>(TestService);
    repository = moduleRef.get<BaseRepositoryInterface<TestEntity>>(
      'BaseRepositoryInterface',
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeWithTransaction', () => {
    it('should execute callback with transaction session', async () => {
      const callback = jest.fn().mockResolvedValue('result');

      const result = await service.executeWithTransaction(callback);

      expect(repository.executeWithTransaction).toHaveBeenCalledWith(callback);
      expect(callback).toHaveBeenCalledWith(mockSession);
      expect(result).toBe('result');
    });
  });

  describe('create', () => {
    it('should create a new entity', async () => {
      const createDto = { name: 'New Entity', email: 'new@example.com' };

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto, undefined);
      expect(result).toEqual(testEntity);
    });

    it('should create a new entity with session', async () => {
      const createDto = { name: 'New Entity', email: 'new@example.com' };

      const result = await service.create(createDto, mockSession);

      expect(repository.create).toHaveBeenCalledWith(createDto, mockSession);
      expect(result).toEqual(testEntity);
    });
  });

  describe('findAll', () => {
    it('should find all entities with default parameters', async () => {
      const result = await service.findAll();

      expect(repository.findAll).toHaveBeenCalledWith(
        {}, // condition
        undefined, // populate
        {}, // options
        undefined, // transformer
        undefined, // projection
        undefined, // session
      );
      expect(result.data).toEqual([testEntity]);
      expect(result.meta.pagination.total).toBe(1);
    });

    it('should find all entities with filter parameters', async () => {
      const filter = {
        search: 'test',
        page: 2,
        limit: 20,
        sort: 'name',
        order: 'asc',
      };

      await service.findAll(filter);

      expect(repository.findAll).toHaveBeenCalledWith(
        { $text: { $search: 'test' } }, // condition
        undefined, // populate
        {
          sort: { name: 1 },
          skip: 20,
          limit: 20,
        }, // options
        undefined, // transformer
        undefined, // projection
        undefined, // session
      );
    });

    it('should find all entities with transformer', async () => {
      const transformer = new TestTransformer();

      await service.findAll(undefined, undefined, {}, transformer);

      expect(repository.findAll).toHaveBeenCalledWith(
        {}, // condition
        undefined, // populate
        {}, // options
        transformer, // transformer
        undefined, // projection
        undefined, // session
      );
    });
  });

  describe('findOne', () => {
    it('should find one entity by id', async () => {
      const result = await service.findOne('123');

      expect(repository.findOneById).toHaveBeenCalledWith(
        '123', // id
        undefined, // populate
        undefined, // transformer
        undefined, // session
        undefined, // projection
        undefined, // option
      );
      expect(result.data).toEqual(testEntity);
    });

    it('should find one entity by id with transformer', async () => {
      const transformer = new TestTransformer();

      await service.findOne('123', undefined, transformer);

      expect(repository.findOneById).toHaveBeenCalledWith(
        '123', // id
        undefined, // populate
        transformer, // transformer
        undefined, // session
        undefined, // projection
        undefined, // option
      );
    });
  });

  describe('findOneByCondition', () => {
    it('should find one entity by condition', async () => {
      const filter = { name: 'Test Name' };

      const result = await service.findOneByCondition(filter);

      expect(repository.findOneByCondition).toHaveBeenCalledWith(
        filter, // filter
        undefined, // populate
        undefined, // transformer
        undefined, // session
        undefined, // projection
        undefined, // option
      );
      expect(result.data).toEqual(testEntity);
    });
  });

  describe('update', () => {
    it('should update an entity', async () => {
      const filter = { _id: stringToObjectId('123') as any };
      const updateDto = { name: 'Updated Name' };

      const result = await service.update(filter, updateDto);

      expect(repository.update).toHaveBeenCalledWith(
        filter, // filter
        updateDto, // update_dto
        undefined, // transformer
        undefined, // session
        undefined, // options
      );
      expect(result).toEqual(testEntity);
    });

    it('should update an entity with transformer', async () => {
      const filter = { _id: stringToObjectId('123') as any };
      const updateDto = { name: 'Updated Name' };
      const transformer = new TestTransformer();

      await service.update(filter, updateDto, transformer);

      expect(repository.update).toHaveBeenCalledWith(
        filter, // filter
        updateDto, // update_dto
        transformer, // transformer
        undefined, // session
        undefined, // options
      );
    });
  });

  describe('updateMany', () => {
    it('should update many entities', async () => {
      const filter = { name: 'Test Name' };
      const updateDto = { email: 'updated@example.com' };

      const result = await service.updateMany(filter, updateDto);

      expect(repository.updateMany).toHaveBeenCalledWith(
        filter, // filter
        updateDto, // update_dto
        undefined, // options
        undefined, // update
        undefined, // session
      );
      expect(result).toEqual({ modifiedCount: 2 });
    });
  });

  describe('remove', () => {
    it('should soft delete an entity', async () => {
      const result = await service.remove('123');

      expect(repository.softDelete).toHaveBeenCalledWith('123', undefined);
      expect(result).toBe(true);
    });

    it('should soft delete an entity with session', async () => {
      await service.remove('123', mockSession);

      expect(repository.softDelete).toHaveBeenCalledWith('123', mockSession);
    });
  });

  describe('delete', () => {
    it('should permanently delete an entity', async () => {
      const result = await service.delete('123');

      expect(repository.permanentlyDelete).toHaveBeenCalledWith(
        '123',
        undefined,
      );
      expect(result).toBe(true);
    });
  });

  describe('aggregate', () => {
    it('should aggregate entities', async () => {
      const pipeline = [{ $match: { name: 'Test Name' } }];
      const queryParams = { page: 1, limit: 10 };

      const result = await service.aggregate(pipeline, queryParams);

      expect(repository.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          { $match: { name: 'Test Name' } },
          {
            $facet: {
              metadata: [{ $count: 'total' }],
              data: [{ $skip: 0 }, { $limit: 10 }],
            },
          },
        ]),
        undefined, // session
      );
      expect(result.data).toEqual([testEntity]);
      expect(result.meta.pagination.total).toBe(1);
    });

    it('should aggregate entities with transformer', async () => {
      const pipeline = [{ $match: { name: 'Test Name' } }];
      const queryParams = { page: 1, limit: 10, include: 'related' };

      const result = await service.aggregate(
        pipeline,
        queryParams,
        TestTransformer,
      );

      expect(repository.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          { $match: { name: 'Test Name' } },
          {
            $facet: {
              metadata: [{ $count: 'total' }],
              data: expect.arrayContaining([
                { $skip: 0 },
                { $limit: 10 },
                {
                  $lookup: {
                    from: 'relateds',
                    localField: 'related_id',
                    foreignField: '_id',
                    as: 'related',
                  },
                },
              ]),
            },
          },
        ]),
        undefined, // session
      );
      expect(result.data[0]).toHaveProperty('transformed', true);
    });

    it('should aggregate entities with additional filters', async () => {
      const pipeline = [{ $match: { name: 'Test Name' } }];
      const queryParams = { page: 1, limit: 10, status: 'active' };

      await service.aggregate(pipeline, queryParams);

      expect(repository.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          { $match: { name: 'Test Name' } },
          { $match: { status: 'active' } },
          {
            $facet: {
              metadata: [{ $count: 'total' }],
              data: [{ $skip: 0 }, { $limit: 10 }],
            },
          },
        ]),
        undefined, // session
      );
    });
  });

  describe('exists', () => {
    it('should check if an entity exists', async () => {
      const filter = { name: 'Test Name' };

      const result = await service.exists(filter);

      expect(repository.exists).toHaveBeenCalledWith(filter, undefined);
      expect(result).toBe(true);
    });
  });

  describe('count', () => {
    it('should count entities', async () => {
      const filter = { name: 'Test Name' };

      const result = await service.count(filter);

      expect(repository.count).toHaveBeenCalledWith(filter, undefined);
      expect(result).toBe(1);
    });
  });
});
