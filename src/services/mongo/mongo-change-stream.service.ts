import { Injectable, Logger } from '@nestjs/common';
import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

import { EnhancedMongoChangeStreamService } from './entity-change-system.service';

@Injectable()
export class MongoChangeStreamManager implements OnModuleInit, OnModuleDestroy {
  private changeStream: any;
  private readonly logger = new Logger(MongoChangeStreamManager.name);
  private documentCache: Map<string, any> = new Map();

  constructor(
    @InjectConnection() private connection: Connection,
    private eventEmitter: EventEmitter2,
    private enhancedService: EnhancedMongoChangeStreamService,
  ) {}

  async onModuleInit() {
    await this.initializeCache(['users', 'teams', 'companies', 'tasks']);
    this.logger.log('Initializing MongoDB change stream...');
    await this.initChangeStream();
  }

  async onModuleDestroy() {
    if (this.changeStream) {
      await this.changeStream.close();
      this.logger.log('Change stream closed');
    }
  }

  private async initializeCache(collections: string[]) {
    try {
      for (const collection of collections) {
        const documents = await this.connection
          .collection(collection)
          .find({})
          .toArray();
        for (const doc of documents) {
          this.documentCache.set(`${collection}:${doc._id}`, doc);
        }
        this.logger.log(
          `Cached ${documents.length} documents from ${collection} collection`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to initialize document cache:', error);
    }
  }

  private async initChangeStream() {
    try {
      // Watch all collections in the database
      this.changeStream = this.connection.watch([], {
        fullDocument: 'updateLookup', // Include the full updated document on updates
      });

      this.logger.log('MongoDB change stream initialized for all collections');

      this.changeStream.on('change', async (change) => {
        const collectionName = change.ns.coll;
        const documentId = change.documentKey._id;
        const cacheKey = `${collectionName}:${documentId}`;

        // Handle different operation types
        switch (change.operationType) {
          case 'insert':
            // Cache the new document
            if (change.fullDocument) {
              this.documentCache.set(cacheKey, { ...change.fullDocument });
            }

            // Emit event with the new document
            const insertEventName = `mongodb.${collectionName}.${change.operationType}`;
            this.eventEmitter.emit(insertEventName, change);
            break;

          case 'update':
            // Get the previous document from cache
            const prevDocument = this.documentCache.get(cacheKey);

            // Enhance the change object with the previous document
            const enhancedChange = {
              ...change,
              prevDocument: prevDocument || {},
            };

            // Update the cache with the new document
            if (change.fullDocument) {
              this.documentCache.set(cacheKey, { ...change.fullDocument });
            }

            // Emit events with enhanced change object
            const updateEventName = `mongodb.${collectionName}.${change.operationType}`;
            this.eventEmitter.emit(updateEventName, enhancedChange);
            break;

          case 'delete':
            // For deleted documents, emit event with the previous document data
            const deletedDocument = this.documentCache.get(cacheKey);
            if (deletedDocument) {
              const enhancedDeleteChange = {
                ...change,
                prevDocument: deletedDocument,
              };

              // Emit delete event with the previous document
              const deleteEventName = `mongodb.${collectionName}.${change.operationType}`;
              this.eventEmitter.emit(deleteEventName, enhancedDeleteChange);

              // Remove from cache
              this.documentCache.delete(cacheKey);
            }
            break;

          default:
            // Emit generic event for other operations
            const eventName = `mongodb.${collectionName}.${change.operationType}`;
            this.eventEmitter.emit(eventName, change);
        }
      });

      this.changeStream.on('error', (error) => {
        this.logger.error('Change stream error:', error);
        // Attempt to reconnect after a delay
        setTimeout(() => this.initChangeStream(), 5000);
      });
    } catch (error) {
      this.logger.error('Failed to initialize change stream:', error);
      // Attempt to reconnect after a delay
      setTimeout(() => this.initChangeStream(), 5000);
    }
  }
}
