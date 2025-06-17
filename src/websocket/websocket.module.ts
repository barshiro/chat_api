import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebSocketsGateway } from './websockets.gateway';
import { WebSocketsService } from './websockets.service';
import { GroupMembersSchema } from '../models/group-members.schema';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'GroupMembers', schema: GroupMembersSchema }]),
    JwtModule.register({
      secret: 'your-secret-key', // Замените на ваш секрет
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [WebSocketsGateway, WebSocketsService],
  exports: [WebSocketsService],
})
export class WebSocketsModule {}
