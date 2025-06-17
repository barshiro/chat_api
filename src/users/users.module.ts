import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserSchema } from '../models/user.schema';
import { GroupSchema } from '../models/group.schema'; // Импорт схемы группы
import { GroupMembersSchema } from '../models/group-members.schema'; // Импорт схемы участников группы
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Group', schema: GroupSchema }, // Добавляем модель Group
      { name: 'GroupMembers', schema: GroupMembersSchema } // Добавляем модель GroupMembers
    ]),
    NotificationsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
