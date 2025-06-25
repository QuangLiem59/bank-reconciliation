export enum EntityEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
  COMMENTED = 'commented',
}

export class EntityEventDto {
  id: string;
  entityId: string;
  entityType: string;
  eventType: EntityEventType;
  timestamp: Date;
  userId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}
