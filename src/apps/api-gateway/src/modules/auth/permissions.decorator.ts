import { SetMetadata } from '@nestjs/common';

export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

export const ResourceContext = (resourceType: string, idParam: string) =>
  SetMetadata('resourceContext', { resourceType, idParam });
