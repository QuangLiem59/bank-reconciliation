import { FilterParams } from 'src/types/common.type';

import { stringToObjectId } from './stringToObjectId';

export function buildQueryCondition(filters: FilterParams) {
  const conditions: any[] = [];

  if (filters.additionalConditions) {
    conditions.push(filters.additionalConditions);
  }

  if (filters.search) {
    conditions.push(
      buildSearchCondition(
        filters.search,
        filters.searchFields,
        filters.searchJoin,
      ),
    );
  }

  if (filters.searchDate) {
    conditions.push(buildDateCondition(filters.searchDate));
  }

  if (filters.searchNull) {
    conditions.push(buildNullCondition(filters.searchNull));
  }

  return conditions.length > 1 ? { $and: conditions } : conditions[0];
}

export function buildQueryOptions(filters: FilterParams) {
  const options: any = {};

  if (filters.orderBy) {
    options.sort = {
      [filters.orderBy]: filters.sortedBy === 'desc' ? -1 : 1,
    };
  }

  return options;
}

function buildDateCondition(searchDate: string) {
  const [range, field] = searchDate.split('|');
  const [start, end] = range.split(',');
  const dateField = field || 'created_at';

  const condition: any = {};
  if (start) condition.$gte = new Date(start);
  if (end) condition.$lte = new Date(end);

  return { [dateField]: condition };
}

function buildNullCondition(searchNull: string) {
  const [field, value] = searchNull.split(':');
  const condition: any = {};
  if (value) {
    condition.$ne = null;
  } else {
    condition.$eq = null;
  }

  return { [field]: condition };
}

function buildSearchCondition(
  search: string,
  searchFields: string,
  searchJoin: 'and' | 'or' = 'or',
) {
  const fieldOperatorMap = parseSearchFields(searchFields);
  const conditions = search.split(';').map((term) => {
    const [field, ...valueParts] = term.split(':');
    const valueStr = valueParts.join(':').trim();
    const operator = fieldOperatorMap[field] || 'like';
    const parsedValue = parseValue(valueStr, operator);

    return buildFieldCondition(field, operator, parsedValue);
  });

  return conditions.length > 0 ? { [`$${searchJoin}`]: conditions } : {};
}

function parseSearchFields(searchFields: string): Record<string, string> {
  const map: Record<string, string> = {};
  (searchFields?.split(';') || []).forEach((pair) => {
    const [field, operator] = pair.split(':');
    if (field && operator) map[field.trim()] = operator.trim().toLowerCase();
  });
  return map;
}

function parseValue(valueStr: string, operator: string): any {
  if (operator === 'in') {
    return valueStr.split(',').map((v) => parseSingleValue(v));
  }
  if (operator === 'between') {
    const [start, end] = valueStr.split(',').map((v) => parseSingleValue(v));
    return [start ?? null, end ?? null];
  }
  return parseSingleValue(valueStr);
}

function parseSingleValue(valueStr: string): any {
  // Handle ObjectId values
  valueStr = stringToObjectId(valueStr) as any;

  // Handle boolean values
  if (/^(true|false)$/i.test(valueStr)) {
    return valueStr.toLowerCase() === 'true';
  }

  // Handle null/undefined
  if (/^(null|undefined)$/i.test(valueStr)) return null;

  // Handle numbers
  if (/^-?\d+$/.test(valueStr)) return parseInt(valueStr, 10);
  if (/^-?\d+\.?\d+$/.test(valueStr)) return parseFloat(valueStr);

  // Handle ISO dates and date ranges
  const isoDate = parseDate(valueStr);
  if (isoDate) return isoDate;

  // Return string value
  return valueStr;
}

function parseDate(valueStr: string): Date | null {
  const dateFormats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, // ISO format
  ];

  for (const regex of dateFormats) {
    if (regex.test(valueStr)) {
      const date = new Date(valueStr);
      if (!isNaN(date.getTime())) return date;
    }
  }
  return null;
}

function buildFieldCondition(field: string, operator: string, value: any) {
  switch (operator) {
    case 'notexist':
      return { [field]: { $exists: false } };
    case 'exist':
      return { [field]: { $exists: true } };
    case '=':
      return { [field]: value };
    case '!=':
      return { [field]: { $ne: value } };
    case '>':
      return { [field]: { $gt: value } };
    case '>=':
      return { [field]: { $gte: value } };
    case '<':
      return { [field]: { $lt: value } };
    case '<=':
      return { [field]: { $lte: value } };
    case 'like':
      return {
        [field]: {
          $regex: escapeRegex(value.toString()),
          $options: 'i',
        },
      };
    case 'in':
      return { [field]: { $in: value } };
    case 'between':
      return {
        [field]: {
          $gte: value[0] ?? -Infinity,
          $lte: value[1] ?? Infinity,
        },
      };
    case 'contains':
      return {
        [field]: {
          $regex: `\\b${escapeRegex(value.toString())}\\b`,
          $options: 'i',
        },
      };
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
