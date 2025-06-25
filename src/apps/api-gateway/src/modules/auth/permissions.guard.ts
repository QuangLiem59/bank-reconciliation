import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from 'src/apps/api-gateway/src/modules/user/user.service';
import { ROLE_CONSTANTS } from 'src/constants/role.constants';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    if (!requiredPermissions) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user?.data;
    if (!user) throw new ForbiddenException('User not authenticated');

    // Super admin can do anything
    const isSuperAdmin = user.roles.some(
      (role) => role.name === ROLE_CONSTANTS.SUPER_ADMIN,
    );
    if (isSuperAdmin) return true;

    // Get resource context
    const resourceContext = this.reflector.get<{
      resourceType: string;
      idParam: string;
    }>('resourceContext', context.getHandler());

    // Check resource membership if context exists
    const contextParams: { teamId?: string; companyId?: string } = {};
    if (resourceContext) {
      const resourceId = request.params[resourceContext.idParam];
      if (!resourceId) throw new ForbiddenException('Resource ID not found');

      switch (resourceContext.resourceType) {
        case 'company':
          if (
            !user.companies.some((c) => c.company_id.toString() === resourceId)
          )
            throw new ForbiddenException('Not a member of the company');
          contextParams.companyId = resourceId;
          break;

        case 'team':
          if (!user.teams.some((t) => t.team_id.toString() === resourceId))
            throw new ForbiddenException('Not a member of the team');
          contextParams.teamId = resourceId;
          break;

        default:
          throw new ForbiddenException('Invalid resource context');
      }
    }

    const userPermissions = await this.userService.getUserPermissions(
      user.id,
      contextParams,
    );

    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}
