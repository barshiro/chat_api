import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { WebSocketsService } from './websockets.service';
import { JwtStrategy } from '../auth/jwt.strategy';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true
  },
  pingTimeout: 30000,  // Более щадящие таймауты
  pingInterval: 15000
})
export class WebSocketsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(WebSocketsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly webSocketsService: WebSocketsService,
    private readonly jwtStrategy: JwtStrategy,
    @InjectModel('GroupMembers') private readonly groupMembersModel: Model<any>,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
    this.webSocketsService.setServer(this.server);
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.sendError(client, 'No token provided', HttpStatus.UNAUTHORIZED, true);
        return;
      }

      const payload = await this.verifyToken(token);
      client.data.userId = payload.userId;

      await this.joinUserRooms(client, payload.userId);
      this.logger.log(`Client connected: ${client.id}, userId: ${payload.userId}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      this.sendError(client, error.message, error.status || HttpStatus.UNAUTHORIZED, true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}, userId: ${client.data.userId}`);
  }

  @SubscribeMessage('joinGroup')
  async handleJoinGroup(client: Socket, groupId: string) {
    try {
      const userId = client.data.userId;
      if (!await this.validateGroupMembership(userId, groupId)) {
        throw new HttpException('Not a group member', HttpStatus.FORBIDDEN);
      }

      this.joinRoom(client, `group:${groupId}`);
      client.emit('joinedGroup', { groupId });
    } catch (error) {
      this.sendError(client, error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @SubscribeMessage('leaveGroup')
  handleLeaveGroup(client: Socket, groupId: string) {
    this.leaveRoom(client, `group:${groupId}`);
    client.emit('leftGroup', { groupId });
  }

  // ================ Вспомогательные методы ================ //

  private async joinUserRooms(client: Socket, userId: string): Promise<void> {
    try {
      const memberships = await this.groupMembersModel.find({ userId }).exec();
      const groupRooms = memberships.map(m => `group:${m.groupId}`);
      
      // Присоединяем только к новым комнатам
      groupRooms.forEach(room => this.joinRoom(client, room));
      this.joinRoom(client, `user:${userId}`);

      this.logger.debug(`User ${userId} joined ${groupRooms.length} group rooms`);
    } catch (error) {
      this.logger.error(`Failed to join rooms for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  private async validateGroupMembership(userId: string, groupId: string): Promise<boolean> {
    const membership = await this.groupMembersModel.findOne({ userId, groupId }).exec();
    return !!membership;
  }

  private joinRoom(client: Socket, room: string): void {
    if (!client.rooms.has(room)) {
      client.join(room);
      this.logger.debug(`Client ${client.id} joined room ${room}`);
    }
  }

  private leaveRoom(client: Socket, room: string): void {
    if (client.rooms.has(room)) {
      client.leave(room);
      this.logger.debug(`Client ${client.id} left room ${room}`);
    }
  }

  private extractToken(client: Socket): string | null {
    return client.handshake.auth?.token?.replace('Bearer ', '') || 
           client.handshake.headers?.authorization?.replace('Bearer ', '');
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      const decoded = this.jwtService.verify(token);
      return this.jwtStrategy.validate(decoded);
    } catch (error) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
  }

  private sendError(client: Socket, message: string, status: HttpStatus, disconnect = false): void {
    client.emit('error', { message, status });
    if (disconnect) {
      client.disconnect(true);
    }
  }
}
