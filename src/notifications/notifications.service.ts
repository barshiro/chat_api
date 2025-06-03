import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel('Notification') private notificationModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
  ) {}

  async getNotifications(userId: string, limit: number = 10, offset: number = 0, read?: boolean) {
    const query: any = { userId };
    if (read !== undefined) {
      query.read = read;
    }

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(query).exec(),
    ]);

    return { notifications, total };
  }

  async updateNotification(userId: string, notificationId: string, dto: UpdateNotificationDto) {
    const notification = await this.notificationModel
      .findOne({ _id: notificationId, userId })
      .exec();
    if (!notification) {
      throw new HttpException('Уведомление не найдено', HttpStatus.NOT_FOUND);
    }

    notification.read = dto.read;
    await notification.save();

    return { message: 'Уведомление обновлено', notification };
  }

  async createNotification(
    userId: string,
    type: 'contact_request' | 'mention' | 'group_invite' | 'reaction',
    payload: { requesterId?: string; groupId?: string; messageId?: string; content?: string },
  ) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }

    if (user.settings.notifications.global === 'none') {
      return null;
    }

    const notification = new this.notificationModel({
      userId,
      type,
      payload,
      read: false,
    });

    await notification.save();
    return notification;
  }
}