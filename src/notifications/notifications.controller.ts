import { Controller, Get, Put, Param, Body, Query, UseGuards, Request, HttpStatus, HttpException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('users/me/notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getNotifications(
    @Request() req,
    @Query('limit') limit: string = '10',
    @Query('offset') offset: string = '0',
    @Query('read') read?: string,
  ) {
    try {
      const parsedLimit = parseInt(limit, 10);
      const parsedOffset = parseInt(offset, 10);
      const parsedRead = read !== undefined ? read === 'true' : undefined;

      if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
        throw new HttpException('Неверные параметры limit или offset', HttpStatus.BAD_REQUEST);
      }

      return await this.notificationsService.getNotifications(
        req.user.userId,
        parsedLimit,
        parsedOffset,
        parsedRead,
      );
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateNotification(
    @Request() req,
    @Param('id') notificationId: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    try {
      return await this.notificationsService.updateNotification(req.user.userId, notificationId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }
}