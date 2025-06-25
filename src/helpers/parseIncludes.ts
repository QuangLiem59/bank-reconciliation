import { IncludeOptions } from 'src/types/common.type';

/**
 * Parse includes
 * @param includes Includes
 * @returns Parsed includes
 */
export function parseIncludes(includes: string[]): IncludeOptions[] {
  const populateMap: Record<string, IncludeOptions> = {};

  includes.forEach((include) => {
    const parts = include.split('.');
    const root = parts[0];
    const remaining = parts.slice(1).join('.');

    if (!populateMap[root]) {
      populateMap[root] = { path: root, populate: [] };
    }

    if (remaining) {
      (populateMap[root].populate as IncludeOptions[]).push(
        ...parseIncludes([remaining]),
      );
    }
  });

  return Object.values(populateMap).map((pop) => ({
    ...pop,
    populate: (pop.populate as IncludeOptions[]).length
      ? pop.populate
      : undefined,
  }));
}

/**
 * Get available includes and includes
 * @param transformer Transformer instance
 * @param populate Populate options
 * @returns Available includes and includes
 */
export function getAvailableIncludes(
  transformer: any,
  populate: IncludeOptions | (IncludeOptions | string)[],
): {
  availableIncludes: string[];
  includes: string[];
} {
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

  return {
    availableIncludes,
    includes: includes as string[],
  };
}
