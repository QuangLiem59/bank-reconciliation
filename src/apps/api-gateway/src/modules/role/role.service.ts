import { Role } from '@entities/role.entity';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PermissionsRepositoryInterface } from '@repositories/permission/permissions.interface';
import { RolesRepositoryInterface } from '@repositories/role/roles.interface';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { EntityId } from 'src/types/common.type';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleTransformer } from './transformers/role.transformer';

@Injectable()
export class RoleService extends BaseServiceAbstract<Role> {
  constructor(
    @Inject('RolesRepositoryInterface')
    private readonly rolesRepository: RolesRepositoryInterface,
    @Inject('PermissionsRepositoryInterface')
    private readonly permissionsRepository: PermissionsRepositoryInterface,
  ) {
    super(rolesRepository);
  }

  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    const permissions = await this.permissionsRepository.findAll({
      _id: { $in: createRoleDto.permissions },
    });
    if (
      permissions.meta.pagination.count !== createRoleDto.permissions.length
    ) {
      throw new NotFoundException('Some permissions not found');
    }
    return this.rolesRepository.create(createRoleDto);
  }

  async updateRole(id: EntityId, updateRoleDto: UpdateRoleDto): Promise<Role> {
    let permissionData: any;
    if (updateRoleDto.permissions.length) {
      const permissions = await this.permissionsRepository.findAll({
        _id: { $in: updateRoleDto.permissions },
      });
      if (!permissions.meta.pagination.count) {
        throw new NotFoundException('Some permissions not found');
      }
      permissionData = permissions.data;
    }

    const data: any = permissionData
      ? { ...updateRoleDto, permissions: permissionData }
      : { ...updateRoleDto };

    return this.rolesRepository.update(
      {
        _id: id,
      },
      data,
      new RoleTransformer([]),
    );
  }

  async hasPermission(
    userRoles: EntityId[],
    apiPath: string,
    method: string,
  ): Promise<boolean> {
    const permission = await this.permissionsRepository.findOneByCondition({
      apiPath,
      method,
    });
    if (!permission) return false;

    const roles = await this.rolesRepository.findAll({
      _id: { $in: userRoles },
      permissions: permission.data._id,
    });
    return roles.meta.pagination.count > 0;
  }
}
