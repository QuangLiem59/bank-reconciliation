import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export function ApiDocsPagination(entity: string) {
  return applyDecorators(
    ApiQuery({
      name: 'page',
      type: Number,
      required: false,
      examples: {
        '1': {
          value: 1,
          description: `Get the first page of ${entity}s`,
        },
        '2': {
          value: 2,
          description: `Get the second page of ${entity}s`,
        },
      },
    }),
    ApiQuery({
      name: 'limit',
      type: Number,
      required: false,
      examples: {
        '10': {
          value: 10,
          description: `Get 10 ${entity}s`,
        },
        '50': {
          value: 50,
          description: `Get 50 ${entity}s`,
        },
      },
    }),
    ApiQuery({
      name: 'include',
      type: String,
      required: false,
      description: 'Include related entities',
    }),
    ApiQuery({
      name: 'orderBy',
      type: String,
      examples: {
        name: {
          value: 'name',
          description: 'Order by name',
        },
        email: {
          value: 'email',
          description: 'Order by email',
        },
      },
      required: false,
      description: 'Order by field',
    }),
    ApiQuery({
      name: 'sortedBy',
      type: String,
      examples: {
        asc: {
          value: 'asc',
          description: 'Sort by asc',
        },
        desc: {
          value: 'desc',
          description: 'Sort by desc',
        },
      },
      required: false,
      description: 'Sort by field',
    }),
    ApiQuery({
      name: 'search',
      type: String,
      examples: {
        example: {
          value: 'field:value;another:value',
          description: 'Search field by value',
        },
      },
      required: false,
      description: 'Search by field',
    }),
    ApiQuery({
      name: 'searchJoin',
      type: String,
      examples: {
        and: {
          value: 'and',
          description: 'Search multiple field with and relation',
        },
        or: {
          value: 'or',
          description: 'Search multiple field with or relation',
        },
      },
      required: false,
      description: 'Search field relation',
    }),
    ApiQuery({
      name: 'searchFields',
      type: String,
      examples: {
        like: {
          value: 'name:like',
          description: 'Search name with like operator',
        },
        in: {
          value: 'name:in',
          description: 'Search name with like operator',
        },
      },
      required: false,
      description: 'Search Operators',
    }),
    ApiQuery({
      name: 'searchDate',
      type: String,
      examples: {
        example: {
          value: '2025-01-01,2025-01-31|updated_at',
          description: 'Search updated_at between 2 date',
        },
      },
      required: false,
      description: 'Search by date',
    }),
    ApiQuery({
      name: 'searchNull',
      type: String,
      examples: {
        example: {
          value: 'deleted_at:not',
          description: 'Search deleted_at not null',
        },
      },
      required: false,
      description: 'Search null',
    }),
  );
}
