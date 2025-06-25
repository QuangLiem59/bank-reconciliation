import { Injectable } from '@nestjs/common';

import { EntityEventDto, EntityEventType } from './dto/entity-event.dto';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private realtimeGateway: RealtimeGateway) {}

  // Entity Event Methods
  notifyEntityCreated(
    entityType: string,
    entityId: string,
    userId: string,
    metadata?: Record<string, any>,
  ) {
    const event: EntityEventDto = {
      id: Date.now().toString(),
      entityId,
      entityType,
      eventType: EntityEventType.CREATED,
      timestamp: new Date(),
      userId,
      metadata,
    };

    this.realtimeGateway.sendEntityEvent(event);
    return event;
  }

  notifyEntityUpdated(
    entityType: string,
    entityId: string,
    userId: string,
    changes: Record<string, any>,
    metadata?: Record<string, any>,
  ) {
    const event: EntityEventDto = {
      id: Date.now().toString(),
      entityId,
      entityType,
      eventType: EntityEventType.UPDATED,
      timestamp: new Date(),
      userId,
      changes,
      metadata,
    };

    this.realtimeGateway.sendEntityEvent(event);
    return event;
  }

  notifyEntityDeleted(
    entityType: string,
    entityId: string,
    userId: string,
    metadata?: Record<string, any>,
  ) {
    const event: EntityEventDto = {
      id: Date.now().toString(),
      entityId,
      entityType,
      eventType: EntityEventType.DELETED,
      timestamp: new Date(),
      userId,
      metadata,
    };

    this.realtimeGateway.sendEntityEvent(event);
    return event;
  }

  notifyEntityAssigned(
    entityType: string,
    entityId: string,
    userId: string,
    assigneeId: string,
    metadata?: Record<string, any>,
  ) {
    const event: EntityEventDto = {
      id: Date.now().toString(),
      entityId,
      entityType,
      eventType: EntityEventType.ASSIGNED,
      timestamp: new Date(),
      userId,
      metadata: {
        ...metadata,
        assigneeId,
      },
    };

    this.realtimeGateway.sendEntityEvent(event);
    return event;
  }
}
