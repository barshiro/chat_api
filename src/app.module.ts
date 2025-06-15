import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { GroupMembersModule } from './group-members/group-members.module';
import { RolesModule } from './roles/roles.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebSocketsModule } from './websocket/websocket.module';
import { UserSchema } from './models/user.schema';
import { GroupSchema } from './models/group.schema';
import { NotificationSchema } from './models/notification.schema';
import { MessageSchema } from './models/message.schema';
import { RolesSchema } from './models/roles.schema';
import { GroupMembersSchema } from './models/group-members.schema';
import { KeysStorageSchema } from './models/keys-storage.schema';
import { ReactionSchema } from './models/reaction.schema';
import { MessagesModule } from './messages/message.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URL'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Group', schema: GroupSchema },
      { name: 'Notification', schema: NotificationSchema },
      { name: 'Message', schema: MessageSchema },
      { name: 'Roles', schema: RolesSchema },
      { name: 'GroupMembers', schema: GroupMembersSchema },
      { name: 'KeysStorage', schema: KeysStorageSchema },
      { name: 'Reaction', schema: ReactionSchema },
    ]),
    UsersModule,
    AuthModule,
    GroupsModule,
    GroupMembersModule,
    RolesModule,
    NotificationsModule,
    WebSocketsModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}