import { Permission } from '@entities/permission.entity';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export const userPermissions = [
  {
    name: 'create_user',
    description: 'Create a new user',
    api_path: '/users',
    method: 'POST',
  },
  {
    name: 'read_user',
    description: 'Read a user',
    api_path: '/users/:id',
    method: 'GET',
  },
  {
    name: 'update_user',
    description: 'Update a user',
    api_path: '/users/:id',
    method: 'PUT',
  },
  {
    name: 'delete_user',
    description: 'Delete a user',
    api_path: '/users/:id',
    method: 'DELETE',
  },
  {
    name: 'list_users',
    description: 'List all users',
    api_path: '/users',
    method: 'GET',
  },
];

export const rolePermissions = [
  {
    name: 'create_role',
    description: 'Create a new role',
    api_path: '/roles',
    method: 'POST',
  },
  {
    name: 'read_role',
    description: 'Read a role',
    api_path: '/roles/:id',
    method: 'GET',
  },
  {
    name: 'update_role',
    description: 'Update a role',
    api_path: '/roles/:id',
    method: 'PUT',
  },
  {
    name: 'delete_role',
    description: 'Delete a role',
    api_path: '/roles/:id',
    method: 'DELETE',
  },
  {
    name: 'list_roles',
    description: 'List all roles',
    api_path: '/roles',
    method: 'GET',
  },
];

export const transactionPermissions = [
  {
    name: 'create_transaction',
    description: 'Create a new transaction',
    api_path: '/transactions',
    method: 'POST',
  },
  {
    name: 'read_transaction',
    description: 'Read a transaction',
    api_path: '/transactions/:id',
    method: 'GET',
  },
  {
    name: 'update_transaction',
    description: 'Update a transaction',
    api_path: '/transactions/:id',
    method: 'PUT',
  },
  {
    name: 'delete_transaction',
    description: 'Delete a transaction',
    api_path: '/transactions/:id',
    method: 'DELETE',
  },
  {
    name: 'list_transactions',
    description: 'List all transactions',
    api_path: '/transactions',
    method: 'GET',
  },
];

export const fileUploadPrermissions = [
  {
    name: 'upload_file',
    description: 'Upload a file',
    api_path: '/file-upload/transactions',
    method: 'POST',
  },
  {
    name: 'get_upload_status',
    description: 'Get upload status',
    api_path: '/file-upload/status/:uploadId',
    method: 'GET',
  },
  {
    name: 'get_upload_history',
    description: 'Get upload history',
    api_path: '/file-upload/history',
    method: 'GET',
  },
];
@Injectable()
export class PermissionSeedService {
  constructor(
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<Permission>,
  ) {}

  async onModuleInit() {
    // await this.addtionalPermissions();
  }

  async seedPermissions() {
    const permissions = [
      ...userPermissions,
      ...rolePermissions,
      ...transactionPermissions,
      ...fileUploadPrermissions,
    ];

    for (const permission of permissions) {
      const existing = await this.permissionModel
        .findOne({ name: permission.name })
        .exec();
      if (!existing) {
        await this.permissionModel.create(permission);
      }
    }
  }
}
