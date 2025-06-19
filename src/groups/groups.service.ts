import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateGroupDto } from './dto/create-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel('Group') private groupModel: Model<any>,
    @InjectModel('GroupMembers') private groupMembersModel: Model<any>,
    @InjectModel('Roles') private rolesModel: Model<any>,
    @InjectModel('KeysStorage') private keysStorageModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('Notification') private notificationModel: Model<any>,
    @InjectModel('Message') private messageModel: Model<any>,
    private notificationsService: NotificationsService,
    private usersService: UsersService,
  ) {}
async getGroupMessages(groupId: string, userId: string, page = 1, limit = 50) {
  // Проверяем, является ли пользователь участником группы
  const membership = await this.groupMembersModel.findOne({ groupId, userId }).exec();
  if (!membership) {
    throw new HttpException('Вы не являетесь участником группы', HttpStatus.FORBIDDEN);
  }

  // Получаем сообщения с пагинацией
  const messages = await this.messageModel
    .find({ groupId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('senderId', 'public.username public.displayName public.avatar')
    .exec();

  return {
    messages,
    pagination: {
      currentPage: page,
      itemsPerPage: limit,
      totalItems: await this.messageModel.countDocuments({ groupId }),
      totalPages: Math.ceil(await this.messageModel.countDocuments({ groupId }) / limit),
    }
  };
}
async deleteGroup(userId: string, groupId: string) {
  const group = await this.groupModel.findById(groupId).exec();
  if (!group) {
    throw new HttpException('Группа не найдена', HttpStatus.NOT_FOUND);
  }

  // Проверяем, является ли пользователь создателем группы
  if (group.payload.createdBy !== userId) {
    throw new HttpException('Только создатель группы может её удалить', HttpStatus.FORBIDDEN);
  }

  // Удаляем все связанные данные последовательно
  await this.messageModel.deleteMany({ groupId }).exec();          // Удаляем сообщения
  await this.notificationModel.deleteMany({ 'payload.groupId': groupId }).exec(); // Удаляем уведомления
  await this.groupMembersModel.deleteMany({ groupId }).exec();     // Удаляем участников
  await this.rolesModel.deleteMany({ groupId }).exec();            // Удаляем роли
  await this.keysStorageModel.deleteOne({ groupId }).exec();       // Удаляем ключи
  await this.groupModel.deleteOne({ _id: groupId }).exec();        // Удаляем саму группу

  return { message: 'Группа и все связанные данные успешно удалены' };
}


  
  async createGroup(userId: string, dto: CreateGroupDto) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }

    // Генерируем ID для группы заранее
    const groupId = uuidv4();

    // Создать роль администратора
    const adminRole = new this.rolesModel({
      _id: uuidv4(),
      groupId: groupId, // Используем предварительно сгенерированный groupId
      name: 'Администратор',
      color: '#FF0000',
      permissions: {
        sendMessages: true,
        manageMessages: true,
        manageRoles: true,
        manageChannels: true,
        kickMembers: true,
        banMembers: true,
        mentionEveryone: true,
        attachFiles: true,
        voiceChat: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Создать роль обычного пользователя
    const userRole = new this.rolesModel({
      _id: uuidv4(),
      groupId: groupId, // Используем предварительно сгенерированный groupId
      name: 'Обычный пользователь',
      color: '#000000',
      permissions: {
        sendMessages: true,
        manageMessages: false,
        manageRoles: false,
        manageChannels: false,
        kickMembers: false,
        banMembers: false,
        mentionEveryone: false,
        attachFiles: true,
        voiceChat: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Сначала сохраняем роли
    await Promise.all([adminRole.save(), userRole.save()]);

    // Создать группу
    const group = new this.groupModel({
      _id: groupId, // Используем предварительно сгенерированный ID
      payload: {
        name: dto.name,
        description: dto.description || '',
        type: dto.type,
        avatar: dto.avatar,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        settings: {
          joinMode: dto.joinMode || 'open',
          messagePermissions: dto.messagePermissions || 'all',
          slowMode: dto.slowMode || 0,
          defaultRole: userRole._id, // Используем ID сохраненной роли
        },
        pinnedMessages: [],
      },
    });

    // Добавить создателя как администратора
    const membership = new this.groupMembersModel({
      _id: uuidv4(),
      groupId: group._id,
      userId,
      roles: [adminRole._id],
      joinedAt: new Date().toISOString(),
      settings: { notifications: 'all', hidden: false },
    });

    // Создать запись для ключей
    const keysStorage = new this.keysStorageModel({
      _id: uuidv4(),
      groupId: group._id,
      Keys_storage: { keys_sym: '' },
      createdAt: new Date().toISOString(),
    });
  
    await Promise.all([group.save(), membership.save(), keysStorage.save()]);

    return {
      _id: group._id,
      payload: group.payload,
    };
}
  async inviteMember(userId: string, groupId: string, dto: InviteMemberDto) {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new HttpException('Группа не найдена', HttpStatus.NOT_FOUND);
    }

    const inviterMembership = await this.groupMembersModel
      .findOne({ groupId, userId })
      .populate('roles')
      .exec();
    if (!inviterMembership) {
      throw new HttpException('Вы не являетесь участником группы', HttpStatus.FORBIDDEN);
    }

    const canInvite =
      group.payload.createdBy === userId ||
      (Array.isArray(inviterMembership.roles) &&
        inviterMembership.roles.some((role: any) => role?.permissions?.kickMembers));
    if (!canInvite) {
      console.log('Invite failed for user:', userId, 'Roles:', inviterMembership.roles);
      throw new HttpException('Нет прав для приглашения', HttpStatus.FORBIDDEN);
    }

    const invitee = await this.userModel.findById(dto.userId).exec();
    if (!invitee) {
      throw new HttpException('Приглашаемый пользователь не найден', HttpStatus.NOT_FOUND);
    }

    const role = await this.rolesModel.findById(dto.roleId).exec();
    if (!role || role.groupId !== groupId) {
      throw new HttpException('Роль не найдена или не принадлежит группе', HttpStatus.NOT_FOUND);
    }

    const existingMembership = await this.groupMembersModel
      .findOne({ groupId, userId: dto.userId })
      .exec();
    if (existingMembership) {
      throw new HttpException('Пользователь уже в группе', HttpStatus.BAD_REQUEST);
    }

    if (group.payload.settings.joinMode === 'invite') {
      await this.notificationsService.createNotification(dto.userId, 'group_invite', {
        requesterId: userId,
        groupId: groupId,
        roleId: dto.roleId, // Сохраняем roleId в уведомлении
        content: `Вы приглашены в группу ${group.payload.name} с ролью ${role.name}`,
      });
      return { message: 'Приглашение отправлено' };
    } else if (group.payload.settings.joinMode === 'open') {
      const membership = new this.groupMembersModel({
        _id: uuidv4(),
        groupId,
        userId: dto.userId,
        roles: [dto.roleId],
        joinedAt: new Date().toISOString(),
        settings: { notifications: 'all', hidden: false },
      });
      await membership.save();
      return { message: 'Пользователь добавлен в группу' };
    } else if (group.payload.settings.joinMode === 'approval') {
      throw new HttpException('Режим approval не реализован', HttpStatus.NOT_IMPLEMENTED);
    }
  }

  async joinGroup(userId: string, groupId: string, dto: JoinGroupDto) {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new HttpException('Группа не найдена', HttpStatus.NOT_FOUND);
    }

    if (group.payload.settings.joinMode !== 'invite') {
      throw new HttpException('Вступление возможно только по приглашению', HttpStatus.BAD_REQUEST);
    }

    const existingMembership = await this.groupMembersModel
      .findOne({ groupId, userId })
      .exec();
    if (existingMembership) {
      throw new HttpException('Вы уже являетесь участником группы', HttpStatus.BAD_REQUEST);
    }

    // Проверка наличия уведомления
    const notificationQuery: any = {
      userId,
      type: 'group_invite',
      'payload.groupId': groupId,
    };
    if (dto.notificationId) {
      notificationQuery._id = dto.notificationId;
    }

    const notification = await this.notificationModel
      .findOne(notificationQuery)
      .exec();
    if (!notification) {
      throw new HttpException('Приглашение не найдено', HttpStatus.NOT_FOUND);
    }

    // Получить роль из уведомления
    const roleId = notification.payload.roleId;
    const role = await this.rolesModel.findById(roleId).exec();
    if (!role || role.groupId !== groupId) {
      throw new HttpException('Роль не найдена или не принадлежит группе', HttpStatus.NOT_FOUND);
    }

    // Добавить пользователя в группу
    const membership = new this.groupMembersModel({
      _id: uuidv4(),
      groupId,
      userId,
      roles: [roleId],
      joinedAt: new Date().toISOString(),
      settings: { notifications: 'all', hidden: false },
    });

    // Обновить KeysStorage
    const keysStorage = await this.keysStorageModel.findOne({ groupId }).exec();
    if (keysStorage) {
      keysStorage.Keys_storage.keys_sym = JSON.stringify({
        ...JSON.parse(keysStorage.Keys_storage.keys_sym || '{}'),
        [userId]: '',
      });
      await keysStorage.save();
    }

    // Пометить уведомление как прочитанное
    await this.notificationModel
      .updateOne({ _id: notification._id }, { read: true })
      .exec();

    await membership.save();

    return { message: 'Вы успешно вступили в группу', groupId };
  }

  async createRole(userId: string, groupId: string, dto: CreateRoleDto) {
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

    const canManageRoles =
      group.payload.createdBy === userId ||
      (Array.isArray(membership.roles) &&
        membership.roles.some((role: any) => role?.permissions?.manageRoles));
    if (!canManageRoles) {
      throw new HttpException('Нет прав для управления ролями', HttpStatus.FORBIDDEN);
    }

    const role = new this.rolesModel({
      _id: uuidv4(),
      groupId,
      name: dto.name,
      color: dto.color || '#000000',
      permissions: dto.permissions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await role.save();
    return { _id: role._id, name: role.name, color: role.color, permissions: role.permissions };
  }

  async updateRole(userId: string, groupId: string, roleId: string, dto: UpdateRoleDto) {
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

    const canManageRoles =
      group.payload.createdBy === userId ||
      (Array.isArray(membership.roles) &&
        membership.roles.some((role: any) => role?.permissions?.manageRoles));
    if (!canManageRoles) {
      throw new HttpException('Нет прав для управления ролями', HttpStatus.FORBIDDEN);
    }

    const role = await this.rolesModel.findById(roleId).exec();
    if (!role || role.groupId !== groupId) {
      throw new HttpException('Роль не найдена или не принадлежит группе', HttpStatus.NOT_FOUND);
    }

    if (dto.name) role.name = dto.name;
    if (dto.color) role.color = dto.color;
    if (dto.permissions) role.permissions = { ...role.permissions, ...dto.permissions };
    role.updatedAt = new Date().toISOString();

    await role.save();
    return { _id: role._id, name: role.name, color: role.color, permissions: role.permissions };
  }

  async deleteRole(userId: string, groupId: string, roleId: string) {
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

    const canManageRoles =
      group.payload.createdBy === userId ||
      (Array.isArray(membership.roles) &&
        membership.roles.some((role: any) => role?.permissions?.manageRoles));
    if (!canManageRoles) {
      throw new HttpException('Нет прав для управления ролями', HttpStatus.FORBIDDEN);
    }

    const role = await this.rolesModel.findById(roleId).exec();
    if (!role || role.groupId !== groupId) {
      throw new HttpException('Роль не найдена или не принадлежит группе', HttpStatus.NOT_FOUND);
    }

    if (role._id === group.payload.settings.defaultRole) {
      throw new HttpException('Нельзя удалить роль по умолчанию', HttpStatus.BAD_REQUEST);
    }

    // Удалить роль из всех участников
    await this.groupMembersModel
      .updateMany({ groupId, roles: roleId }, { $pull: { roles: roleId } })
      .exec();

    await this.rolesModel.deleteOne({ _id: roleId }).exec();
    return { message: 'Роль удалена' };
  }

  async getMembers(groupId: string, userId: string) {
    const membership = await this.groupMembersModel.findOne({ groupId, userId }).exec();
    if (!membership) {
      throw new HttpException('Вы не являетесь участником группы', HttpStatus.FORBIDDEN);
    }

    const members = await this.groupMembersModel
      .find({ groupId })
      .populate('roles')
      .populate('userId', 'public.username public.displayName')
      .exec();

    return members;
  }

  async removeMember(userId: string, groupId: string, targetUserId: string) {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new HttpException('Группа не найдена', HttpStatus.NOT_FOUND);
    }

    const removerMembership = await this.groupMembersModel
      .findOne({ groupId, userId })
      .populate('roles')
      .exec();
    if (!removerMembership) {
      throw new HttpException('Вы не являетесь участником группы', HttpStatus.FORBIDDEN);
    }

    const canRemove =
      group.payload.createdBy === userId ||
      (Array.isArray(removerMembership.roles) &&
        removerMembership.roles.some((role: any) => role?.permissions?.kickMembers));
    if (!canRemove) {
      throw new HttpException('Нет прав для удаления', HttpStatus.FORBIDDEN);
    }

    const targetMembership = await this.groupMembersModel
      .findOne({ groupId, userId: targetUserId })
      .exec();
    if (!targetMembership) {
      throw new HttpException('Пользователь не является участником группы', HttpStatus.NOT_FOUND);
    }

    if (group.payload.createdBy === targetUserId) {
      throw new HttpException('Нельзя удалить создателя группы', HttpStatus.BAD_REQUEST);
    }

    await this.groupMembersModel.deleteOne({ groupId, userId: targetUserId }).exec();
    return { message: 'Пользователь удален из группы' };
  }
}
