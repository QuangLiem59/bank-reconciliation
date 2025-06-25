/**
 * Core Entity Change Tracking System
 *
 * This system provides:
 * 1. Generic change detection for any entity type
 * 2. Specialized change handlers for different entity types
 * 3. Custom event emitting for specific change scenarios
 * 4. Support for both simple and complex nested field changes
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnEvent } from '@nestjs/event-emitter';
import * as _ from 'lodash';

import {
  ArrayChangeResult,
  ArrayFieldChangeEvent,
  ArrayObjectChangeResult,
  ChangeResult,
  EntityChangeEvent,
  FieldChangeEvent,
} from './entity-change-system.interface.service';

// Utility service for tracking and comparing changes
@Injectable()
export class EntityChangeService {
  private readonly logger = new Logger(EntityChangeService.name);

  constructor(private eventEmitter: EventEmitter2) {}

  /**
   * Compare two documents and return structured changes
   */
  compareDocuments(
    oldDoc: Record<string, any>,
    newDoc: Record<string, any>,
  ): ChangeResult {
    const result: ChangeResult = {
      added: {},
      removed: {},
      modified: {},
    };

    // Get all unique keys from both objects
    const allKeys = Array.from(
      new Set([...Object.keys(oldDoc), ...Object.keys(newDoc)]),
    );

    allKeys.forEach((key) => {
      // Field was added
      if (!(key in oldDoc) && key in newDoc) {
        result.added[key] = newDoc[key];
      }
      // Field was removed
      else if (key in oldDoc && !(key in newDoc)) {
        result.removed[key] = oldDoc[key];
      }
      // Field potentially modified
      else if (!_.isEqual(oldDoc[key], newDoc[key])) {
        result.modified[key] = {
          oldValue: oldDoc[key],
          newValue: newDoc[key],
        };
      }
    });

    return result;
  }

  /**
   * Compare simple arrays and return added/removed items
   */
  compareArrays(oldArray: any[], newArray: any[]): ArrayChangeResult {
    const result: ArrayChangeResult = {
      added: [],
      removed: [],
    };

    // Find items that were added (in new but not in old)
    result.added = newArray.filter((item) => !_.includes(oldArray, item));

    // Find items that were removed (in old but not in new)
    result.removed = oldArray.filter((item) => !_.includes(newArray, item));

    return result;
  }

  /**
   * Compare objects and return structured changes
   */
  compareObjects(
    oldObj: Record<string, any>,
    newObj: Record<string, any>,
  ): ChangeResult {
    return this.compareDocuments(oldObj, newObj);
  }

  /**
   * Compare arrays of objects using a unique identifier function
   */
  compareArrayOfObjects(
    oldArray: Record<string, any>[],
    newArray: Record<string, any>[],
    idFn: (obj: Record<string, any>) => string | number,
  ): ArrayObjectChangeResult {
    const result: ArrayObjectChangeResult = {
      added: [],
      removed: [],
      modified: [],
    };

    // Create maps for easier lookup
    const oldMap = new Map(oldArray.map((item) => [idFn(item), item]));
    const newMap = new Map(newArray.map((item) => [idFn(item), item]));

    // Find added objects (in new but not in old)
    const addedIds = [...newMap.keys()].filter((id) => !oldMap.has(id));
    result.added = addedIds.map((id) => newMap.get(id));

    // Find removed objects (in old but not in new)
    const removedIds = [...oldMap.keys()].filter((id) => !newMap.has(id));
    result.removed = removedIds.map((id) => oldMap.get(id));

    // Find modified objects (in both but different)
    const commonIds = [...oldMap.keys()].filter((id) => newMap.has(id));
    commonIds.forEach((id) => {
      const oldItem = oldMap.get(id);
      const newItem = newMap.get(id);

      if (!_.isEqual(oldItem, newItem)) {
        const changes = this.compareObjects(oldItem, newItem);
        if (
          Object.keys(changes.added).length > 0 ||
          Object.keys(changes.removed).length > 0 ||
          Object.keys(changes.modified).length > 0
        ) {
          result.modified.push({
            _id: String(id),
            oldValue: oldItem,
            newValue: newItem,
            changes,
          });
        }
      }
    });

    return result;
  }

  /**
   * Emit specialized events based on detected changes
   */
  emitChangeEvents(
    entityType: string,
    entityId: string,
    changes: ChangeResult,
    oldDoc: Record<string, any>,
    newDoc: Record<string, any>,
  ) {
    const reqUser = newDoc.last_modified_by;
    // Emit a general entity change event
    this.eventEmitter.emit('entity.change', {
      entityType,
      entityId,
      changes,
      oldDocument: oldDoc,
      newDocument: newDoc,
    } as EntityChangeEvent);

    // Emit entity-specific change event
    this.eventEmitter.emit(`entity.${entityType}.change`, {
      entityType,
      entityId,
      changes,
      oldDocument: oldDoc,
      newDocument: newDoc,
    } as EntityChangeEvent);

    // Emit events for added fields
    Object.entries(changes.added).forEach(([field, value]) => {
      this.eventEmitter.emit(`entity.${entityType}.field.added`, {
        entityType,
        entityId,
        field,
        oldValue: undefined,
        newValue: value,
        reqUser,
      } as FieldChangeEvent);
    });

    // Emit events for removed fields
    Object.entries(changes.removed).forEach(([field, value]) => {
      this.eventEmitter.emit(`entity.${entityType}.field.removed`, {
        entityType,
        entityId,
        field,
        oldValue: value,
        newValue: undefined,
        reqUser,
      } as FieldChangeEvent);
    });

    // Emit events for modified fields
    Object.entries(changes.modified).forEach(
      ([field, { oldValue, newValue }]) => {
        this.eventEmitter.emit(`entity.${entityType}.field.modified`, {
          entityType,
          entityId,
          field,
          oldValue,
          newValue,
          reqUser,
        } as FieldChangeEvent);

        // Emit field-specific change event
        this.eventEmitter.emit(`entity.${entityType}.field.${field}.changed`, {
          entityType,
          entityId,
          field,
          oldValue,
          newValue,
          reqUser,
        } as FieldChangeEvent);

        // Handle array fields specifically
        if (Array.isArray(oldValue) && Array.isArray(newValue)) {
          let arrayChanges;
          if (typeof oldValue[0] === 'object') {
            arrayChanges = this.compareArrayOfObjects(
              oldValue,
              newValue,
              (item: any) => String(item._id),
            );
          } else {
            arrayChanges = this.compareArrays(oldValue, newValue);
          }

          if (
            arrayChanges.added?.length > 0 ||
            arrayChanges.removed?.length > 0 ||
            arrayChanges.modified?.length > 0
          ) {
            this.eventEmitter.emit(
              `entity.${entityType}.array.${field}.changed`,
              {
                entityType,
                entityId,
                field,
                changes: arrayChanges,
                oldValue,
                newValue,
                reqUser,
              } as ArrayFieldChangeEvent,
            );

            // Emit events for each array item added
            arrayChanges.added?.forEach((item) => {
              this.eventEmitter.emit(
                `entity.${entityType}.array.${field}.item.added`,
                {
                  entityType,
                  entityId,
                  field,
                  item,
                  oldValue,
                  newValue,
                  reqUser,
                },
              );
            });

            // Emit events for each array item removed
            arrayChanges.removed?.forEach((item) => {
              this.eventEmitter.emit(
                `entity.${entityType}.array.${field}.item.removed`,
                {
                  entityType,
                  entityId,
                  field,
                  item,
                  oldValue,
                  newValue,
                  reqUser,
                },
              );
            });

            // Emit events for each array item modified
            arrayChanges.modified?.forEach((item) => {
              this.eventEmitter.emit(
                `entity.${entityType}.array.${field}.item.modified`,
                {
                  entityType,
                  entityId,
                  field,
                  item: item.newValue,
                  oldValue: item.oldValue,
                  changes: item.changes,
                  reqUser,
                },
              );
            });
          }
        }
      },
    );
  }
}

/**
 * Service that connects to MongoDB change stream and utilizes EntityChangeService
 */
@Injectable()
export class EnhancedMongoChangeStreamService {
  private readonly logger = new Logger(EnhancedMongoChangeStreamService.name);

  constructor(
    private changeService: EntityChangeService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process a MongoDB change event
   */
  processMongoChange(change: any) {
    const collectionName = change.ns.coll;
    const documentId = change.documentKey._id;

    // Only process updates with previous documents available
    if (
      change.operationType === 'update' &&
      change.prevDocument &&
      change.fullDocument
    ) {
      const oldDoc = change.prevDocument;
      const newDoc = change.fullDocument;

      // Use EntityChangeService to detect changes
      const changes = this.changeService.compareDocuments(oldDoc, newDoc);

      this.logger.debug(
        `Changes detected in ${collectionName}:${documentId}`,
        JSON.stringify(changes, null, 2),
      );

      // Emit specialized events through EntityChangeService
      this.changeService.emitChangeEvents(
        collectionName, // Use collection name as entity type
        documentId.toString(),
        changes,
        oldDoc,
        newDoc,
      );
    }
  }

  /**
   * Subscribe to MongoDB change events
   */
  @OnEvent('mongodb.*.update')
  handleMongoUpdate(payload: any) {
    this.processMongoChange(payload);
  }
}
