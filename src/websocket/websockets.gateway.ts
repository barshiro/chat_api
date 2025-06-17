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
  pingTimeout: 10000,
  pingInterval: 5000
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
        this.disconnectWithError(client, 'No token provided', HttpStatus.UNAUTHORIZED);
        return;
      }

      const payload = await this.verifyToken(token);
      client.data.userId = payload.userId;

      await this.joinUserRooms(client, payload.userId);

      this.logger.log(`Client connected: ${client.id}, userId: ${payload.userId}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      this.disconnectWithError(client, error.message, error.status || HttpStatus.UNAUTHORIZED);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
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

  private async joinUserRooms(client: Socket, userId: string): Promise<void> {
    const memberships = await this.groupMembersModel.find({ userId }).exec();
    memberships.forEach(membership => {
      client.join(`group:${membership.groupId}`);
    });
    client.join(`user:${userId}`);
  }

  private disconnectWithError(client: Socket, message: string, status: HttpStatus): void {
    client.emit('error', { message, status });
    client.disconnect(true);
  }

  @SubscribeMessage('joinGroup')
  async handleJoinGroup(client: Socket, groupId: string) {
    try {
      const membership = await this.groupMembersModel.findOne({
        groupId,
        userId: client.data.userId
      }).exec();

      if (!membership) {
        throw new HttpException('Not a group member', HttpStatus.FORBIDDEN);
      }

      client.join(`group:${groupId}`);
      client.emit('joinedGroup', { groupId });
    } catch (error) {
      client.emit('error', { 
        message: error.message,
        status: error.status || HttpStatus.BAD_REQUEST
      });
    }
  }

  @SubscribeMessage('leaveGroup')
  handleLeaveGroup(client: Socket, groupId: string) {
    client.leave(`group:${groupId}`);
    client.emit('leftGroup', { groupId });
  }
}
