import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from 'src/apps/api-gateway/src/modules/user/user.service';

import { RoleService } from './role.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly userService: UserService,
    private readonly roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const userRoles = await this.userService.getUserRoles(user._id);
    const apiPath = request.route.path;
    const method = request.method;

    return await this.roleService.hasPermission(userRoles, apiPath, method);
  }
}
