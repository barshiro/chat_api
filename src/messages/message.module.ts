import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagesService } from './message.service';
import { MessagesController } from './message.controller';
import { MessageSchema } from '../models/message.schema';
import { ReactionSchema } from '../models/reaction.schema';
import { GroupSchema } from '../models/group.schema';
import { GroupMembersSchema } from '../models/group-members.schema';
import { RolesSchema } from '../models/roles.schema';
import { UserSchema } from '../models/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebSocketsModule } from '../websocket/websocket.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Message', schema: MessageSchema },
      { name: 'Reaction', schema: ReactionSchema },
      { name: 'Group', schema: GroupSchema },
      { name: 'GroupMembers', schema: GroupMembersSchema },
      { name: 'Roles', schema: RolesSchema },
      { name: 'User', schema: UserSchema },
    ]),
    NotificationsModule,
    WebSocketsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}