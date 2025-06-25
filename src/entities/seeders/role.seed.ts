import { Permission } from '@entities/permission.entity';
import { Role } from '@entities/role.entity';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ROLE_CONSTANTS } from 'src/constants/role.constants';

import { PermissionSeedService } from './permission.seed';

@Injectable()
export class RoleSeedService implements OnModuleInit {
  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<Permission>,
    private readonly permissionSeedService: PermissionSeedService,
  ) {}

  async onModuleInit() {
    await this.seedRoles();
  }

  async seedRoles() {
    // Seed permissions
    await this.permissionSeedService.seedPermissions();

    // Get all permissions
    const permissions = await this.permissionModel.find().exec();
    const permissionIds = permissions.map((p) => p._id);

    // Get Guest permissions (api_path including /teams and only GET method)
    const guestPermissionIds = permissions
      .filter((p) => p.method === 'GET')
      .map((p) => p._id);

    const roles = [
      {
        name: ROLE_CONSTANTS.SUPER_ADMIN,
        description: 'Super Administrator with full access',
        display_name: 'Super Administrator',
        permissions: permissionIds,
      },
      {
        name: ROLE_CONSTANTS.GUEST,
        description: 'Guest with observer access',
        display_name: 'Guest',
        permissions: guestPermissionIds,
      },
    ];

    for (const role of roles) {
      const current = await this.roleModel.findOne({
        name: role.name,
      });
      if (!current) {
        await this.roleModel.create(role);
        console.log(`Role ${role.name} created successfully`);
      } else {
        await this.roleModel.updateOne({ name: role.name }, role);
        console.log(`Role ${role.name} updated successfully`);
      }
    }
  }
}
