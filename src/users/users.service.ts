import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AddContactDto } from './dto/add-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { EditUserDto } from './dto/edit-user.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private userModel: Model<any>,
    private notificationsService: NotificationsService,
  ) {}

  async editUser(userId: string, dto: EditUserDto) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Check username uniqueness
    if (dto.username && dto.username !== user.public.username) {
      const existing = await this.userModel
        .findOne({ 'public.username': dto.username })
        .exec();
      if (existing) {
        throw new HttpException('Username already exists', HttpStatus.BAD_REQUEST);
      }
    }

    // Update public fields
    user.public.username = dto.username || user.public.username;
    user.public.displayName = dto.displayName || user.public.displayName;
    user.public.bio = dto.bio !== undefined ? dto.bio : user.public.bio;
    user.public.profileLink = dto.profileLink !== undefined ? dto.profileLink : user.public.profileLink;
    user.public.birthDate = dto.birthDate !== undefined ? dto.birthDate : user.public.birthDate;
    user.public.avatar = dto.avatar !== undefined ? dto.avatar : user.public.avatar;

    // Update settings
    if (dto.settings) {
      if (dto.settings.notifications) {
        user.settings.notifications = {
          ...user.settings.notifications,
          ...dto.settings.notifications,
        };
      }
      if (dto.settings.privacy) {
        user.settings.privacy = {
          ...user.settings.privacy,
          ...dto.settings.privacy,
        };
      }
      if (dto.settings.theme) {
        user.settings.theme = dto.settings.theme;
      }
    }

    user.updatedAt = new Date().toISOString();
    await user.save();

    return {
      _id: user._id,
      public: user.public,
      settings: user.settings,
    };
  }

  async getUserById(userId: string, requesterId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Check privacy settings
    if (user.settings.privacy.profileVisibility === 'private' && userId !== requesterId) {
      throw new HttpException('Profile is private', HttpStatus.FORBIDDEN);
    }

    if (user.settings.privacy.profileVisibility === 'friends' && userId !== requesterId) {
      const isFriend = user.contacts.some(
        (contact: any) => contact.userId === requesterId && contact.status === 'accepted',
      );
      if (!isFriend) {
        throw new HttpException('Profile is restricted to friends', HttpStatus.FORBIDDEN);
      }
    }

    // Apply onlineStatus and lastSeen privacy
    const publicData = { ...user.public };
    if (user.settings.privacy.onlineStatus === 'hide' && userId !== requesterId) {
      delete publicData.status;
    }
    if (user.settings.privacy.lastSeen === 'hide' && userId !== requesterId) {
      delete publicData.lastSeen;
    }

    return {
      _id: user._id,
      public: publicData,
    };
  }

  // Existing methods (unchanged)
  async addContact(userId: string, dto: AddContactDto) {
    const { userId: contactId } = dto;
    if (userId === contactId) {
      throw new HttpException('Нельзя добавить себя в контакты', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userModel.findById(userId).exec();
    const contact = await this.userModel.findById(contactId).exec();
    if (!contact) {
      throw new HttpException('Контакт не найден', HttpStatus.NOT_FOUND);
    }

    const existingContact = user.contacts.find((c: any) => c.userId === contactId);
    if (existingContact) {
      throw new HttpException('Контакт уже существует', HttpStatus.BAD_REQUEST);
    }

    user.contacts.push({
      userId: contactId,
      status: 'pending',
      addedAt: new Date().toISOString(),
    });

    contact.contacts.push({
      userId,
      status: 'pending',
      addedAt: new Date().toISOString(),
    });

    await Promise.all([user.save(), contact.save()]);

    await this.notificationsService.createNotification(contactId, 'contact_request', {
      requesterId: userId,
      content: `${user.public.username} отправил запрос на добавление в контакты`,
    });

    return { message: 'Запрос на добавление в контакты отправлен', contact: { userId: contactId, status: 'pending' } };
  }

  async getContacts(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('contacts')
      .populate('contacts.userId', 'public.username public.displayName public.status')
      .exec();
    return user.contacts;
  }

  async updateContact(userId: string, contactId: string, dto: UpdateContactDto) {
    const { status } = dto;
    const user = await this.userModel.findById(userId).exec();
    const contact = await this.userModel.findById(contactId).exec();
    if (!contact) {
      throw new HttpException('Contact not found', HttpStatus.NOT_FOUND);
    }

    const userContact = user.contacts.find((c: any) => c.userId === contactId);
    if (!userContact) {
      throw new HttpException('Contact not in list', HttpStatus.BAD_REQUEST);
    }

    const contactUser = contact.contacts.find((c: any) => c.userId === userId);
    if (!contactUser) {
      throw new HttpException('Reciprocal contact not found', HttpStatus.BAD_REQUEST);
    }

    userContact.status = status;
    contactUser.status = status;

    await Promise.all([user.save(), contact.save()]);
    return { message: 'Contact updated', contact: { userId: contactId, status } };
  }

  async removeContact(userId: string, contactId: string) {
    const user = await this.userModel.findById(userId).exec();
    const contact = await this.userModel.findById(contactId).exec();
    if (!contact) {
      throw new HttpException('Contact not found', HttpStatus.NOT_FOUND);
    }

    user.contacts = user.contacts.filter((c: any) => c.userId !== contactId);
    contact.contacts = contact.contacts.filter((c: any) => c.userId !== userId);

    await Promise.all([user.save(), contact.save()]);
    return { message: 'Contact removed' };
  }

  async searchUsers(query: string, requesterId: string) {
  if (!query) {
    throw new HttpException('Query is required', HttpStatus.BAD_REQUEST);
  }

  try {
    // Escape special regex characters
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await this.userModel
      .find({
        $or: [
          { 'public.username': { $regex: escapedQuery, $options: 'i' } },
          { 'public.displayName': { $regex: escapedQuery, $options: 'i' } },
        ],
      })
      .select('public.username public.displayName public.status settings.privacy contacts')
      .limit(10)
      .exec();

    const filteredUsers = users.filter(user => {
      if (user.settings.privacy.profileVisibility === 'public') {
        return true;
      }
      if (user.settings.privacy.profileVisibility === 'friends') {
        return user.contacts.some(
          (contact: any) => contact.userId.toString() === requesterId && contact.status === 'accepted'
        );
      }
      return user._id.toString() === requesterId; // Include self
    });

    if (filteredUsers.length === 0) {
      throw new HttpException('No users found', HttpStatus.NOT_FOUND);
    }

    return filteredUsers.map(user => {
      const publicData = {
        username: user.public.username,
        displayName: user.public.displayName,
        status: user.public.status,
      };
      if (user.settings.privacy.onlineStatus === 'hide' && user._id.toString() !== requesterId) {
        delete publicData.status;
      }
      return { _id: user._id, public: publicData };
    });
  } catch (error) {
    console.error('Search users error:', error);
    throw new HttpException(
      error.message || 'Failed to search users',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
}