import { Role } from '@entities/role.entity';
import { User } from '@entities/user.entity';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserService } from 'src/apps/api-gateway/src/modules/user/user.service';
import { ROLE_CONSTANTS } from 'src/constants/role.constants';

@Injectable()
export class UserSeedService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
    private readonly userService: UserService,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdmin();
  }

  async seedSuperAdmin() {
    const existingSuperAdmin = await this.userModel.findOne({
      email: process.env.SUPER_ADMIN_EMAIL,
    });

    if (!existingSuperAdmin) {
      const superAdminRole = await this.roleModel.findOne({
        name: ROLE_CONSTANTS.SUPER_ADMIN,
      });

      const superAdmin = await this.userService.createUser({
        name: 'Super Admin',
        username: 'superadmin',
        email: process.env.SUPER_ADMIN_EMAIL || 'admin@admin.com',
        password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123',
        phone: process.env.SUPER_ADMIN_PHONE || '1234567890',
        active: true,
        bio: 'System Super Administrator',
        gender: 'unspecified',
      });

      if (superAdmin && superAdminRole) {
        await this.userService.assignRoles(superAdmin.data.id, [
          superAdminRole._id,
        ]);

        console.log('Super Admin created successfully');
      }
    }
  }
}
