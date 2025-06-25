import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from 'src/apps/api-gateway/src/modules/auth/jwt-ws-auth.guard';

import { EntityEventDto } from './dto/entity-event.dto';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  constructor(private wsJwtGuard: WsJwtGuard) {}
  private logger: Logger = new Logger('RealtimeGateway');

  private userSocketMap = new Map<string, string[]>();

  afterInit() {
    this.logger.log('Initialized WebSocket Gateway');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(
      `Client connected: ${client.id}, args: ${args.map((arg) => JSON.stringify(arg))}`,
    );

    // Authenticate user on connection
    const authenticated = await this.handleSecuredConnection(client);
    if (authenticated) {
      const userId = client.data.user.id;
      // Store socket mapping for later use
      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, []);
      }
      this.userSocketMap.get(userId).push(client.id);
      this.logger.log(`User ${userId} connected with socket ${client.id}`);
    }
  }

  async handleSecuredConnection(client: Socket) {
    try {
      const user = await this.wsJwtGuard.validateToken(client);
      client.data.user = user.data;
      return true;
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
      return false;
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove socket from userSocketMap
    if (client.data?.user?.id) {
      const userId = client.data.user.id;
      const sockets = this.userSocketMap.get(userId) || [];
      const updatedSockets = sockets.filter(
        (socketId) => socketId !== client.id,
      );

      if (updatedSockets.length === 0) {
        this.userSocketMap.delete(userId);
      } else {
        this.userSocketMap.set(userId, updatedSockets);
      }
      this.logger.log(`Removed socket ${client.id} for user ${userId}`);
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    client.emit('joinedRoom', room);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, room: string) {
    client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);
    client.emit('leftRoom', room);
  }

  // Room-based entity events methods
  @SubscribeMessage('subscribeToEntity')
  handleSubscribeToEntity(
    client: Socket,
    payload: { entityType: string; entityId: string },
  ) {
    const room = `${payload.entityType}-${payload.entityId}`;
    client.join(room);
    this.logger.log(
      `Client ${client.id} subscribed to ${payload.entityType} ${payload.entityId}`,
    );
    client.emit('subscribed', {
      entityType: payload.entityType,
      entityId: payload.entityId,
    });
  }

  @SubscribeMessage('unsubscribeFromEntity')
  handleUnsubscribeFromEntity(
    client: Socket,
    payload: { entityType: string; entityId: string },
  ) {
    const room = `${payload.entityType}-${payload.entityId}`;
    client.leave(room);
    this.logger.log(
      `Client ${client.id} unsubscribed from ${payload.entityType} ${payload.entityId}`,
    );
    client.emit('unsubscribed', {
      entityType: payload.entityType,
      entityId: payload.entityId,
    });
  }

  // Send entity event to all clients in an entity's room
  sendEntityEvent(event: EntityEventDto) {
    const room = `${event.entityType}-${event.entityId}`;
    this.logger.log(
      `Broadcasting ${event.eventType} event for ${event.entityType} ${event.entityId} to room ${room}`,
    );
    this.server.to(room).emit('entityEvent', event);
  }

  // Allow clients to mark notifications as read
  @SubscribeMessage('markNotificationAsRead')
  handleMarkNotificationAsRead(client: Socket, notificationId: string) {
    this.logger.log(
      `Notification ${notificationId} marked as read by user ${client.data?.user?.id}`,
    );

    return { success: true, notificationId };
  }

  // Original message handlers
  @SubscribeMessage('roomMessage')
  handleRoomMessage(client: Socket, payload: { room: string; message: any }) {
    this.logger.log(
      `Message to room ${payload.room}: ${JSON.stringify(payload.message)}`,
    );
    // Send to specific room only
    this.server.to(payload.room).emit('roomMessage', payload.message);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any): void {
    this.logger.log(`Broadcast message: ${JSON.stringify(payload)}`);
    // Broadcast to all connected clients
    this.server.emit('message', payload);
  }
}
