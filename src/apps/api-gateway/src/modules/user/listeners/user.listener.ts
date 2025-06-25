import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { BaseEntityChangeHandler } from '@services/mongo/base/base.entity-change-handler.abstract.service';
import {
  EntityChangeEvent,
  FieldChangeEvent,
} from '@services/mongo/entity-change-system.interface.service';
import { RealtimeService } from 'src/apps/api-gateway/src/modules/realtime/realtime.service';
import { RoleService } from 'src/apps/api-gateway/src/modules/role/role.service';

@Injectable()
export class UserListener extends BaseEntityChangeHandler {
  constructor(
    protected eventEmitter: EventEmitter2,
    private readonly realtimeService: RealtimeService,
    private readonly roleService: RoleService,
  ) {
    super(eventEmitter);
  }

  @OnEvent('mongodb.users.created')
  handleUserCreated(event: EntityChangeEvent) {
    this.logger.log(`User ${event.entityId} created`);
  }

  @OnEvent('entity.users.change')
  handleEntityChange(event: EntityChangeEvent) {
    this.logger.log(`User ${event.entityId} changed`);

    if (Object.keys(event.changes.added).length > 0) {
      this.logger.log(
        `User ${event.entityId} had fields added:`,
        Object.keys(event.changes.added),
      );
    }

    if (Object.keys(event.changes.removed).length > 0) {
      this.logger.log(
        `User ${event.entityId} had fields removed:`,
        Object.keys(event.changes.removed),
      );
    }

    if (Object.keys(event.changes.modified).length > 0) {
      this.logger.log(
        `User ${event.entityId} had fields modified:`,
        Object.keys(event.changes.modified),
      );
    }
  }

  @OnEvent('entity.users.field.modified')
  handleFieldChange(event: FieldChangeEvent) {
    this.logger.log(
      `User ${event.entityId} field '${event.field}' changed from '${event.oldValue}' to '${event.newValue}'`,
    );
  }

  @OnEvent('entity.users.field.phone.changed')
  handlePhoneChange(event: FieldChangeEvent) {
    this.logger.log(
      `User ${event.entityId} changed phone from ${event.oldValue} to ${event.newValue}`,
    );
  }

  @OnEvent('entity.users.array.teams.item.added')
  handleTeamAdded(event: any) {
    this.logger.log(`User ${event.entityId} received team: ${event.item}`);
  }

  @OnEvent('entity.users.array.teams.item.removed')
  handleTeamRemoved(event: any) {
    this.logger.log(`User ${event.entityId} lost team: ${event.item}`);
  }

  @OnEvent('entity.users.array.teams.item.modified')
  async handleTeamModified(event: any) {
    this.logger.log(`User ${event.entityId} team changed: ${event.item}`);
  }
}
