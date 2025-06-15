import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpException, HttpStatus } from '@nestjs/common';
import { WebSocketsService } from './websockets.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class WebSocketsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private jwtService: JwtService,
    private webSocketsService: WebSocketsService,
    @InjectModel('GroupMembers') private groupMembersModel: Model<any>,
  ) {}

  afterInit() {
    this.webSocketsService.setServer(this.server);
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.userId;

      const memberships = await this.groupMembersModel.find({ userId: payload.userId }).exec();
      for (const membership of memberships) {
        client.join(`group:${membership.groupId}`);
        client.join(`user:${payload.userId}`); // Для персональных уведомлений
      }

      console.log(`Client connected: ${client.id}, userId: ${payload.userId}`);
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinGroup')
  async handleJoinGroup(client: Socket, groupId: string) {
    const membership = await this.groupMembersModel
      .findOne({ groupId, userId: client.data.userId })
      .exec();
    if (!membership) {
      client.emit('error', { message: 'Вы не участник группы', status: HttpStatus.FORBIDDEN });
      return;
    }
    client.join(`group:${groupId}`);
    client.emit('joinedGroup', { groupId });
  }

  @SubscribeMessage('leaveGroup')
  handleLeaveGroup(client: Socket, groupId: string) {
    client.leave(`group:${groupId}`);
    client.emit('leftGroup', { groupId });
  }
}