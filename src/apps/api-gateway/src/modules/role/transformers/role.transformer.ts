import { Role } from '@entities/role.entity';
import { BaseTransformerAbstract } from '@transformers/base.abstract.transformer';

import { PermissionTransformer } from './permission.transformer';

export class RoleTransformer extends BaseTransformerAbstract<Role, any> {
  protected availableIncludes = ['permissions'];
  protected defaultIncludes = [];

  async transform(role: Role): Promise<object> {
    if (!role) return null;

    const includes = await this.includes(role);
    const response = {
      id: role.id || role._id,
      name: role.name,
      description: role.description,
      display_name: role.display_name,

      ...includes,

      created_at: (role as any).created_at,
      updated_at: (role as any).updated_at,
    };

    return response;
  }

  async includePermissions(role: Role) {
    const transformedData = await Promise.all(
      role.permissions.map((permission: any) =>
        new PermissionTransformer([]).transform(permission),
      ),
    );

    return transformedData;
  }
}
