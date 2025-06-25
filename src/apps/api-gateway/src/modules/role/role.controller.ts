import { Role } from '@entities/role.entity';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/apps/api-gateway/src/modules/auth/jwt-auth.guard';
import { Permissions } from 'src/apps/api-gateway/src/modules/auth/permissions.decorator';
import { PermissionsGuard } from 'src/apps/api-gateway/src/modules/auth/permissions.guard';
import { ApiDocsPagination } from 'src/decorators/swagger.decorator';
import { addMetaNextLink } from 'src/helpers/addMetaNextLink';
import {
  EntityId,
  FindAllResponse,
  FindOneResponse,
  IncludeOptions,
  QueryParams,
} from 'src/types/common.type';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleService } from './role.service';
import { RoleTransformer } from './transformers/role.transformer';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  /* Create a new role */
  @Permissions('create_role')
  @ApiOperation({
    summary: 'Create a new role',
    description: 'Adds a new role to the system',
  })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully',
    type: Role,
  })
  @Post()
  async createRole(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    return this.roleService.createRole(createRoleDto);
  }

  /* List all roles */
  @Permissions('list_roles')
  @ApiOperation({
    summary: 'List all roles',
    description: 'Retrieve a paginated list of roles from the system',
  })
  @ApiDocsPagination(Role.name)
  @ApiResponse({
    status: 200,
    description: 'Roles retrieved successfully with pagination',
    schema: {
      example: {
        data: [
          {
            id: '67ad7b05466169b3871d3f2c',
            name: 'super_admin',
            description: 'Super Administrator with full access',
            display_name: 'Super Admin',
            created_at: '2025-02-13T04:54:29.146Z',
            updated_at: '2025-02-13T04:54:29.146Z',
          },
        ],
        meta: {
          include: ['permissions'],
          custom: [],
          pagination: {
            total: 1,
            count: 1,
            per_page: 10,
            current_page: 1,
            total_pages: 1,
            links: {},
          },
        },
      },
    },
  })
  @Get()
  async getAllRoles(
    @Req() request: Request,
    @Query() queryParams: QueryParams,
  ): Promise<FindAllResponse<Role>> {
    const { page, limit, include, ...filters } = queryParams;
    const skip = (page - 1) * limit;

    let populate: IncludeOptions | (IncludeOptions | string)[] = [];
    if (include) {
      populate = include.split(',');
    }

    const response = await this.roleService.findAll(
      { ...filters },
      populate,
      {
        skip,
        limit,
      },
      new RoleTransformer(populate),
    );

    return addMetaNextLink(response, request);
  }

  /* Get a role by ID */
  @Permissions('read_role')
  @ApiOperation({
    summary: 'Get a role by ID',
    description: 'Retrieve a specific role by its unique identifier',
  })
  @ApiResponse({
    status: 200,
    description: 'Retrieve a specific role',
    schema: {
      example: {
        data: {
          id: '67ad7b05466169b3871d3f2c',
          name: 'super_admin',
          description: 'Super Administrator with full access',
          display_name: 'Super Admin',
          created_at: '2025-02-13T04:54:29.146Z',
          updated_at: '2025-02-13T04:54:29.146Z',
        },
        meta: {
          include: ['permissions'],
        },
      },
    },
  })
  @Get(':id')
  async getRoleById(
    @Param('id') id: EntityId,
    @Query('include') include?: string,
  ): Promise<FindOneResponse<Role>> {
    let populate: IncludeOptions | (IncludeOptions | string)[] = [];
    if (include) {
      populate = include.split(',');
    }

    return this.roleService.findOne(
      id,
      populate,
      new RoleTransformer(populate),
    );
  }

  /* Update a role */
  @Permissions('update_role')
  @ApiOperation({
    summary: 'Update a role',
    description: 'Update an existing role',
  })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
    type: Role,
  })
  @Put(':id')
  async updateRole(
    @Param('id') id: EntityId,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<Role> {
    return this.roleService.updateRole(id, updateRoleDto);
  }

  /* Delete a role */
  @Permissions('delete_role')
  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @Delete(':id')
  async deleteRole(@Param('id') id: EntityId): Promise<boolean> {
    return this.roleService.delete(id);
  }
}
