import { Permission } from '@entities/permission.entity';
import { BaseTransformerAbstract } from '@transformers/base.abstract.transformer';

export class PermissionTransformer extends BaseTransformerAbstract<
  Permission,
  any
> {
  protected availableIncludes = [];
  protected defaultIncludes = [];

  async transform(permission: Permission): Promise<object> {
    if (!permission) return null;

    const includes = await this.includes(permission);
    const response = {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      api_path: permission.api_path,
      method: permission.method,

      ...includes,

      created_at: (permission as any).created_at,
      updated_at: (permission as any).updated_at,
    };

    return response;
  }
}
