import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { WebSocketsService } from '../websocket/websockets.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel('Message') private messageModel: Model<any>,
    @InjectModel('Reaction') private reactionModel: Model<any>,
    @InjectModel('Group') private groupModel: Model<any>,
    @InjectModel('GroupMembers') private groupMembersModel: Model<any>,
    @InjectModel('Roles') private rolesModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    private notificationsService: NotificationsService,
    private webSocketsService: WebSocketsService,
  ) {}

  async createMessage(userId: string, groupId: string, dto: CreateMessageDto) {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new HttpException('Группа не найдена', HttpStatus.NOT_FOUND);
    }

    const membership = await this.groupMembersModel
      .findOne({ groupId, userId })
      .populate('roles')
      .exec();
    if (!membership) {
      throw new HttpException('Вы не являетесь участником группы', HttpStatus.FORBIDDEN);
    }

    const canSendMessages =
      group.payload.settings.messagePermissions === 'all' ||
      group.payload.createdBy === userId ||
      (Array.isArray(membership.roles) &&
        membership.roles.some((role: any) => role?.permissions?.sendMessages));
    if (!canSendMessages) {
      throw new HttpException('Нет прав для отправки сообщений', HttpStatus.FORBIDDEN);
    }

    const mentions = dto.format?.mentions || [];
    for (const mention of mentions) {
      const mentionedUser = await this.userModel.findById(mention.userId).exec();
      if (!mentionedUser) {
        throw new HttpException(`Упомянутый пользователь ${mention.userId} не найден`, HttpStatus.BAD_REQUEST);
      }
      const mentionedMembership = await this.groupMembersModel
        .findOne({ groupId, userId: mention.userId })
        .exec();
      if (!mentionedMembership) {
        throw new HttpException(`Упомянутый пользователь ${mention.userId} не в группе`, HttpStatus.BAD_REQUEST);
      }
    }

    if (dto.replyTo) {
      const repliedMessage = await this.messageModel.findById(dto.replyTo).exec();
      if (!repliedMessage || repliedMessage.groupId !== groupId) {
        throw new HttpException('Сообщение для ответа не найдено или не в этой группе', HttpStatus.BAD_REQUEST);
      }
    }

    const message = new this.messageModel({
      _id: uuidv4(),
      groupId,
      senderId: userId,
      payload: {
        type: dto.type,
        payload: dto.payload,
        format: dto.format,
        attachments: dto.attachments || [],
        replyTo: dto.replyTo,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await message.save();

    const messageResponse = {
      _id: message._id,
      groupId: message.groupId,
      senderId: message.senderId,
      payload: message.payload,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };

    // Отправка WebSocket-события
    this.webSocketsService.emitMessageCreated(groupId, messageResponse);

    // Создание уведомлений
    for (const mention of mentions) {
      if (mention.userId !== userId) {
        const notification = await this.notificationsService.createNotification(mention.userId, 'mention', {
          requesterId: userId,
          groupId,
          messageId: message._id,
          content: `Вы были упомянуты в сообщении в группе ${group.payload.name}`,
        });
        this.webSocketsService.emitNotificationCreated(mention.userId, notification);
      }
    }

    return messageResponse;
  }

  async updateMessage(userId: string, messageId: string, dto: UpdateMessageDto) {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message) {
      throw new HttpException('Сообщение не найдено', HttpStatus.NOT_FOUND);
    }

    const group = await this.groupModel.findById(message.groupId).exec();
    if (!group) {
      throw new HttpException('Группа не найдена', HttpStatus.NOT_FOUND);
    }

    const membership = await this.groupMembersModel
      .findOne({ groupId: message.groupId, userId })
      .populate('roles')
      .exec();
    if (!membership) {
      throw new HttpException('Вы не являетесь участником группы', HttpStatus.FORBIDDEN);
    }

    const isSender = message.senderId === userId;
    const isGroupCreator = group.payload.createdBy === userId;
    const canManageMessages =
      isGroupCreator ||
      (Array.isArray(membership.roles) &&
        membership.roles.some((role: any) => role?.permissions?.manageMessages));
    const canEditAsSender =
      isSender &&
      (isGroupCreator ||
        (Array.isArray(membership.roles) &&
          membership.roles.some((role: any) => role?.permissions?.sendMessages)));

    if (!canEditAsSender && !canManageMessages) {
      throw new HttpException('Нет прав для редактирования этого сообщения', HttpStatus.FORBIDDEN);
    }

    const newMentions = dto.format?.mentions || [];
    const oldMentions = message.payload.format?.mentions || [];
    const oldMentionedUserIds = oldMentions.map(m => m.userId);
    const newMentionedUserIds = newMentions.map(m => m.userId);

    for (const mention of newMentions) {
      const mentionedUser = await this.userModel.findById(mention.userId).exec();
      if (!mentionedUser) {
        throw new HttpException(`Упомянутый пользователь ${mention.userId} не найден`, HttpStatus.BAD_REQUEST);
      }
      const mentionedMembership = await this.groupMembersModel
        .findOne({ groupId: message.groupId, userId: mention.userId })
        .exec();
      if (!mentionedMembership) {
        throw new HttpException(`Упомянутый пользователь ${mention.userId} не в группе`, HttpStatus.BAD_REQUEST);
      }
    }

    if (dto.replyTo) {
      const repliedMessage = await this.messageModel.findById(dto.replyTo).exec();
      if (!repliedMessage || repliedMessage.groupId !== message.groupId) {
        throw new HttpException('Сообщение для ответа не найдено или не в этой группе', HttpStatus.BAD_REQUEST);
      }
    }

    message.payload = {
      type: dto.type || message.payload.type,
      payload: dto.payload !== undefined ? dto.payload : message.payload.payload,
      format: dto.format || message.payload.format,
      attachments: dto.attachments || message.payload.attachments,
      replyTo: dto.replyTo !== undefined ? dto.replyTo : message.payload.replyTo,
    };

    message.edited = {
      isEdited: true,
      editedAt: new Date().toISOString(),
    };
    message.updatedAt = new Date().toISOString();

    await message.save();

    const messageResponse = {
      _id: message._id,
      groupId: message.groupId,
      senderId: message.senderId,
      payload: message.payload,
      edited: message.edited,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };

    // Отправка WebSocket-события
    this.webSocketsService.emitMessageUpdated(group._id, messageResponse);

    const addedMentions = newMentionedUserIds.filter(id => !oldMentionedUserIds.includes(id));
    for (const mentionedUserId of addedMentions) {
      if (mentionedUserId !== userId) {
        const notification = await this.notificationsService.createNotification(mentionedUserId, 'mention', {
          requesterId: userId,
          groupId: message.groupId,
          messageId: message._id,
          content: `Вы были упомянуты в отредактированном сообщении в группе ${group.payload.name}`,
        });
        this.webSocketsService.emitNotificationCreated(mentionedUserId, notification);
      }
    }

    return messageResponse;
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message) {
      throw new HttpException('Сообщение не найдено', HttpStatus.NOT_FOUND);
    }

    const group = await this.groupModel.findById(message.groupId).exec();
    if (!group) {
      throw new HttpException('Группа не найдена', HttpStatus.NOT_FOUND);
    }

    const membership = await this.groupMembersModel
      .findOne({ groupId: message.groupId, userId })
      .populate('roles')
      .exec();
    if (!membership) {
      throw new HttpException('Вы не являетесь участником группы', HttpStatus.FORBIDDEN);
    }

    const isSender = message.senderId === userId;
    const isGroupCreator = group.payload.createdBy === userId;
    const canManageMessages =
      isGroupCreator ||
      (Array.isArray(membership.roles) &&
        membership.roles.some((role: any) => role?.permissions?.manageMessages));
    const canDeleteAsSender =
      isSender &&
      (isGroupCreator ||
        (Array.isArray(membership.roles) &&
          membership.roles.some((role: any) => role?.permissions?.sendMessages)));

    if (!canDeleteAsSender && !canManageMessages) {
      throw new HttpException('Нет прав для удаления этого сообщения', HttpStatus.FORBIDDEN);
    }

    await this.reactionModel.deleteMany({ messageId }).exec();
    await this.messageModel.deleteOne({ _id: messageId }).exec();

    // Отправка WebSocket-события
    this.webSocketsService.emitMessageDeleted(group._id, messageId);

    return { message: 'Сообщение удалено' };
  }

  async createReaction(userId: string, messageId: string, dto: CreateReactionDto) {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message) {
      throw new HttpException('Сообщение не найдено', HttpStatus.NOT_FOUND);
    }

    const group = await this.groupModel.findById(message.groupId).exec();
    if (!group) {
      throw new HttpException('Группа не найдена', HttpStatus.NOT_FOUND);
    }

    const membership = await this.groupMembersModel
      .findOne({ groupId: message.groupId, userId })
      .exec();
    if (!membership) {
      throw new HttpException('Вы не являетесь участником группы', HttpStatus.FORBIDDEN);
    }

    const existingReaction = await this.reactionModel
      .findOne({ messageId, userId })
      .exec();
    if (existingReaction) {
      throw new HttpException('Вы уже добавили реакцию к этому сообщению', HttpStatus.BAD_REQUEST);
    }

    const reaction = new this.reactionModel({
      _id: uuidv4(),
      messageId,
      groupId: message.groupId,
      userId,
      reaction: dto.reaction,
      createdAt: new Date().toISOString(),
    });

    await reaction.save();

    const reactionResponse = {
      _id: reaction._id,
      messageId: reaction.messageId,
      groupId: reaction.groupId,
      userId: reaction.userId,
      reaction: reaction.reaction,
      createdAt: reaction.createdAt,
    };

    // Отправка WebSocket-события
    this.webSocketsService.emitReactionCreated(group._id, reactionResponse);

    if (message.senderId !== userId) {
      const notification = await this.notificationsService.createNotification(message.senderId, 'reaction', {
        requesterId: userId,
        groupId: message.groupId,
        messageId,
        content: `Пользователь добавил реакцию ${dto.reaction} к вашему сообщению в группе ${group.payload.name}`,
      });
      this.webSocketsService.emitNotificationCreated(message.senderId, notification);
    }

    return reactionResponse;
  }
}