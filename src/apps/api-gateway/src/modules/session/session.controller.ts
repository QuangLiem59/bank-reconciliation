import { Session } from '@entities/session.entity';
import {
  Controller,
  Delete,
  Get,
  Param,
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
import { addMetaNextLink } from 'src/helpers/addMetaNextLink';
import {
  EntityId,
  FindAllResponse,
  IncludeOptions,
  QueryParams,
} from 'src/types/common.type';

import { SessionService } from './session.service';
import { SessionTransformer } from './transformers/session.transformer';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /* Get user sessions */
  @ApiOperation({
    summary: 'Get user sessions',
    description: 'Retrieve all active sessions of the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'User sessions retrieved successfully',
    schema: {
      example: {
        data: [
          {
            _id: '3160f1a0a6c9d47f12c56152',
            device: 'PostmanRuntime/7.43.0',
            ip: '::1',
            expires_at: '2025-03-15T04:54:40.000Z',
            is_revoked: true,
            last_active: '2025-02-13T04:54:40.147Z',
            created_at: '2025-02-13T04:54:40.150Z',
            updated_at: '2025-02-14T08:40:39.853Z',
          },
        ],
        meta: {
          include: ['user'],
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
  async getUserSessions(
    @Req() request: Request,
    @Query() queryParams: QueryParams,
  ): Promise<FindAllResponse<Session>> {
    const { page, limit, include, ...filters } = queryParams;
    const userId = request.user?.data.id;

    const skip = (page - 1) * limit;

    let populate: IncludeOptions | (IncludeOptions | string)[] = [];
    if (include) {
      populate = include.split(',');
    }

    const response = await this.sessionService.findAll(
      {
        ...filters,
        additionalConditions: {
          user: userId,
          is_revoked: false,
          expires_at: { $gt: new Date() },
        },
      },
      populate,
      {
        skip,
        limit,
      },
      new SessionTransformer(populate),
    );

    return addMetaNextLink(response, request);
  }

  /* Revoke a specific session */
  @ApiOperation({
    summary: 'Revoke a specific session',
    description: 'Revoke a specific session by its unique identifier',
  })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
    schema: {
      example: {
        data: {
          _id: '3160f1a0a6c9d47f12c56152',
          device: 'PostmanRuntime/7.43.0',
          ip: '::1',
          expires_at: '2025-03-15T04:54:40.000Z',
          is_revoked: true,
          last_active: '2025-02-13T04:54:40.147Z',
          created_at: '2025-02-13T04:54:40.150Z',
          updated_at: '2025-02-14T08:40:39.853Z',
        },
        meta: {
          include: ['user'],
        },
      },
    },
  })
  @Delete(':sessionId')
  async revokeSession(
    @Req() req: Request,
    @Param('sessionId') sessionId: EntityId,
  ) {
    const userId = req.user?.data.id;
    return this.sessionService.revokeSession(userId, sessionId);
  }
}
