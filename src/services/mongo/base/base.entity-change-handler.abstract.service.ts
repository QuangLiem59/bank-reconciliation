import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  EntityChangeEvent,
  FieldChangeEvent,
} from '../entity-change-system.interface.service';

export abstract class BaseEntityChangeHandler {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected eventEmitter: EventEmitter2) {}

  /**
   * Process entity changes
   */
  abstract handleEntityChange(event: EntityChangeEvent): void;

  /**
   * Process specific field changes
   */
  abstract handleFieldChange(event: FieldChangeEvent): void;
}
