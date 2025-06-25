import { BaseEntity } from '@entities/shared/base/base.entity';
import { toPascalCase } from 'src/helpers/toPascalCase';
import { IncludeOptions } from 'src/types/common.type';

import { BaseTransformerInterface } from './base.interface.transformer';
import { TransformerModuleRefProvider } from './transformer-module-ref.provider';

export abstract class BaseTransformerAbstract<T extends BaseEntity, R>
  implements BaseTransformerInterface<T, R>
{
  protected abstract availableIncludes: string[];
  protected defaultIncludes: string[] = [];

  constructor(
    protected requestedIncludes: IncludeOptions | (IncludeOptions | string)[],
  ) {}

  abstract transform(entity: T): Promise<R>;

  protected getService<T>(token: any): T {
    return TransformerModuleRefProvider.get<T>(token);
  }

  protected async includes(entity: T): Promise<Partial<R>> {
    let includesArray = Array.isArray(this.requestedIncludes)
      ? this.requestedIncludes
      : [this.requestedIncludes];
    includesArray = Array.from(
      new Set([...includesArray, ...this.defaultIncludes]),
    );
    includesArray = includesArray.filter((include) => !!include);
    const availableIncludes = Array.from(
      new Set([...this.availableIncludes, ...this.defaultIncludes]),
    );

    const groupedIncludes = includesArray.reduce(
      (acc, include) => {
        const includePath =
          typeof include === 'string' ? include : include.path;
        const mainInclude = includePath.split('.')[0]?.trim();
        if (!mainInclude || !availableIncludes.includes(mainInclude))
          return acc;
        const subInclude = includePath.split('.').slice(1).join('.');
        if (!acc[mainInclude]) acc[mainInclude] = new Set<string>();
        if (subInclude) acc[mainInclude].add(subInclude);
        else acc[mainInclude].add('');
        return acc;
      },
      {} as Record<string, Set<string>>,
    );

    const includePromises = Object.entries(groupedIncludes).map(
      async ([mainInclude, subIncludesSet]) => {
        const subIncludes = Array.from(subIncludesSet);
        const includeResult = await this.include(
          entity,
          mainInclude,
          subIncludes,
        );
        return { mainInclude, includeResult };
      },
    );

    const includeResults = await Promise.all(includePromises);

    return includeResults.reduce((acc, { mainInclude, includeResult }) => {
      if (includeResult) {
        const key = mainInclude as keyof R;

        acc[key] = acc[key] ? { ...acc[key], ...includeResult } : includeResult;

        // Remove Id mainInclude if it exists (exp: project_id => project, task_id => task)
        // if (mainInclude.endsWith('_id')) {
        //   const newKey = mainInclude.slice(0, -3);
        //   acc[newKey] = acc[key];
        //   acc[key] = includeResult.id;
        // }
      }
      return acc;
    }, {} as Partial<R>);
  }

  protected async include(
    entity: T,
    include: string,
    subIncludes?: IncludeOptions | (IncludeOptions | string)[],
  ) {
    const includeMethod = `include${toPascalCase(include)}`;

    if (typeof this[includeMethod] === 'function') {
      return await this[includeMethod](entity, subIncludes || []);
    }
    return null;
  }

  getMeta() {
    return {
      availableIncludes: this.availableIncludes,
      defaultIncludes: this.defaultIncludes,
    };
  }
}
