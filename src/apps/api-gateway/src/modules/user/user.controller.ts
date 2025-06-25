import { User } from '@entities/user.entity';
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
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/apps/api-gateway/src/modules/auth/jwt-auth.guard';
import { Permissions } from 'src/apps/api-gateway/src/modules/auth/permissions.decorator';
import { PermissionsGuard } from 'src/apps/api-gateway/src/modules/auth/permissions.guard';
import { RoleService } from 'src/apps/api-gateway/src/modules/role/role.service';
import { ROLE_CONSTANTS } from 'src/constants/role.constants';
import { ApiDocsPagination } from 'src/decorators/swagger.decorator';
import { addMetaNextLink } from 'src/helpers/addMetaNextLink';
import {
  EntityId,
  FindAllResponse,
  FindOneResponse,
  IncludeOptions,
  QueryParams,
} from 'src/types/common.type';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserTransformer } from './transformers/user.transformer';
import { UserService } from './user.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly roleService: RoleService,
  ) {}

  /* Get current role */
  @ApiOperation({
    summary: 'Get current role',
    description: 'Retrieve the current role of the authenticated user',
  })
  @Get('current-role')
  async getCurrentRole(@Req() request: Request): Promise<object> {
    const userId = request.user.data.id;
    return this.userService.getUserRole(userId);
  }

  /* Update profile */
  @ApiOperation({
    summary: 'Update profile',
    description: 'Update the profile of the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: User,
  })
  @Put('profile')
  async updateProfile(
    @Req() request: Request,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const userId = request.user.data.id;
    return this.userService.updateUser(userId, updateUserDto);
  }

  /* Get users */
  @ApiOperation({
    summary: 'Get users',
    description: 'Retrieve a paginated list of users from the system',
  })
  @ApiDocsPagination(User.name)
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully with pagination',
    schema: {
      example: {
        data: [
          {
            id: '67ad7b05466169b3871d3f32',
            name: 'Super Admin',
            username: 'superadmin',
            email: 'admin@admin.com',
            phone: '***-***-4567',
            created_at: '2025-02-13T04:54:29.347Z',
            updated_at: '2025-02-13T04:54:29.809Z',
          },
        ],
        meta: {
          include: ['roles', 'profile'],
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
  @Get('list')
  async getUsers(
    @Req() request: Request,
    @Query() queryParams: QueryParams,
  ): Promise<FindAllResponse<User>> {
    const { page, limit, include, ...filters } = queryParams;
    const skip = (page - 1) * limit;

    let populate: IncludeOptions | (IncludeOptions | string)[] = [];
    if (include) {
      populate = include.split(',');
    }

    const supperAdminRole = await this.roleService.findOneByCondition({
      name: ROLE_CONSTANTS.SUPER_ADMIN,
    });

    const response = await this.userService.findAll(
      {
        ...filters,
        additionalConditions: {
          roles: { $nin: [supperAdminRole.data._id] },
        },
      },
      populate,
      {
        skip,
        limit,
      },
      new UserTransformer(populate),
    );

    return addMetaNextLink(response, request);
  }

  /* Create a new user */
  @Permissions('create_user')
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Adds a new user to the system',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: User,
  })
  @Post()
  async create(
    @Req() request: Request,
    @Body() createUserDto: CreateUserDto,
  ): Promise<FindOneResponse<User>> {
    const user = request.user.data;
    createUserDto.last_modified_by = user.id;

    return this.userService.createUser(createUserDto);
  }

  /* Get user by ID */
  @Permissions('read_user')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their unique identifier',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Unique identifier of the user (MongoDB ObjectId)',
    example: '64b930d17c9c750012345678',
  })
  @ApiResponse({
    status: 200,
    description: 'Retrieve a specific user',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id')
  async getById(
    @Param('id') id: EntityId,
    @Query('include') include?: string,
  ): Promise<FindOneResponse<User>> {
    let populate: IncludeOptions | (IncludeOptions | string)[] = [];
    if (include) {
      populate = include.split(',');
    }

    return this.userService.findById(id, populate);
  }

  /* Update an existing user */
  @Permissions('update_user')
  @ApiOperation({
    summary: 'Update an existing user',
    description: 'Modify user details, such as name or roles',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Unique identifier of the user (MongoDB ObjectId)',
    example: '64b930d17c9c750012345678',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Put(':id')
  async update(
    @Req() request: Request,
    @Param('id') id: EntityId,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = request.user.data;
    updateUserDto.last_modified_by = user.id;

    return this.userService.updateUser(id, updateUserDto);
  }

  /* Delete a user */
  @Permissions('delete_user')
  @ApiOperation({
    summary: 'Delete a user',
    description: 'Remove a user from the system by their unique identifier',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Unique identifier of the user (MongoDB ObjectId)',
    example: '64b930d17c9c750012345678',
  })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Delete(':id')
  async delete(@Param('id') id: EntityId): Promise<void> {
    return this.userService.deleteUser(id);
  }

  /* List all users */
  @Permissions('list_users')
  @ApiOperation({
    summary: 'List all users',
    description: 'Retrieve a paginated list of users from the system',
  })
  @ApiDocsPagination(User.name)
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully with pagination',
    schema: {
      example: {
        data: [
          {
            id: '67ad7b05466169b3871d3f32',
            name: 'Super Admin',
            username: 'superadmin',
            email: 'admin@admin.com',
            phone: '***-***-4567',
            active: true,
            last_active: '2025-02-13T04:54:29.346Z',
            created_at: '2025-02-13T04:54:29.347Z',
            updated_at: '2025-02-13T04:54:29.809Z',
          },
        ],
        meta: {
          include: ['roles', 'profile'],
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
  async getAll(
    @Req() request: Request,
    @Query() queryParams: QueryParams,
  ): Promise<FindAllResponse<User>> {
    const { page, limit, include, ...filters } = queryParams;
    const skip = (page - 1) * limit;

    let populate: IncludeOptions | (IncludeOptions | string)[] = [];
    if (include) {
      populate = include.split(',');
    }

    const response = await this.userService.findAll(
      {
        ...filters,
      },
      populate,
      {
        skip,
        limit,
      },
      new UserTransformer(populate),
    );

    return addMetaNextLink(response, request);
  }

  /* Assign role to user */
  @Permissions('update_user')
  @ApiOperation({
    summary: 'Assign role to user',
    description: 'Assign one or more roles to a specific user',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Unique identifier of the user (MongoDB ObjectId)',
    example: '64b930d17c9c750012345678',
  })
  @ApiResponse({
    status: 200,
    description: 'Role assigned successfully',
    type: User,
  })
  @Put(':id/assign-role')
  async assignRoles(
    @Req() request: Request,
    @Param('id') id: EntityId,
    @Body('roleIds') roleIds: EntityId[],
  ): Promise<User> {
    const user = request.user.data;
    const userId = user.id;

    return this.userService.assignRoles(id, roleIds, userId);
  }
}
