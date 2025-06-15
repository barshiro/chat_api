import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class WebSocketsService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emitMessageCreated(groupId: string, message: any) {
    this.server.to(`group:${groupId}`).emit('message.created', message);
  }

  emitMessageUpdated(groupId: string, message: any) {
    this.server.to(`group:${groupId}`).emit('message.updated', message);
  }

  emitMessageDeleted(groupId: string, messageId: string) {
    this.server.to(`group:${groupId}`).emit('message.deleted', { messageId });
  }

  emitReactionCreated(groupId: string, reaction: any) {
    this.server.to(`group:${groupId}`).emit('reaction.created', reaction);
  }

  emitNotificationCreated(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification.created', notification);
  }
}