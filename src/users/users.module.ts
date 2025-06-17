import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserSchema } from '../models/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
     MongooseModule.forFeature([
      { name: 'Group', schema: GroupSchema },
      { name: 'GroupMembers', schema: GroupMembersSchema },
      { name: 'Roles', schema: RolesSchema },
      { name: 'KeysStorage', schema: KeysStorageSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Notification', schema: NotificationSchema }, // Добавляем Notification
    ]),
    NotificationsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
