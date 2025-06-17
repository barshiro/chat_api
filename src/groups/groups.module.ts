import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { GroupSchema } from '../models/group.schema';
import { GroupMembersSchema } from '../models/group-members.schema';
import { RolesSchema } from '../models/roles.schema';
import { KeysStorageSchema } from '../models/keys-storage.schema';
import { UserSchema } from '../models/user.schema';
import { NotificationSchema } from '../models/notification.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Group', schema: GroupSchema },
      { name: 'GroupMembers', schema: GroupMembersSchema },
      { name: 'Roles', schema: RolesSchema },
      { name: 'KeysStorage', schema: KeysStorageSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Notification', schema: NotificationSchema },
       { name: 'Message', schema: MessageSchema },// Добавляем Notification
    ]),
    NotificationsModule,
    UsersModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
