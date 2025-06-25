import { Permission, PermissionSchema } from '@entities/permission.entity';
import { Role, RoleSchema } from '@entities/role.entity';
import { PermissionSeedService } from '@entities/seeders/permission.seed';
import { RoleSeedService } from '@entities/seeders/role.seed';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PermissionsRepository } from '@repositories/permission/permission.repository';
import { RolesRepository } from '@repositories/role/role.repository';

import { RoleController } from './role.controller';
import { RoleService } from './role.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: Permission.name, schema: PermissionSchema },
    ]),
  ],
  providers: [
    RoleService,
    PermissionSeedService,
    RoleSeedService,
    { provide: 'RolesRepositoryInterface', useClass: RolesRepository },
    {
      provide: 'PermissionsRepositoryInterface',
      useClass: PermissionsRepository,
    },
  ],
  exports: [
    RoleService,
    MongooseModule,
    { provide: 'RolesRepositoryInterface', useClass: RolesRepository },
  ],
  controllers: [RoleController],
})
export class RoleModule {}
