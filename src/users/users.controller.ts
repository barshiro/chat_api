import { Controller, Post, Get, Put, Delete, Body, Query, Param, UseGuards, Request, HttpStatus, HttpException } from '@nestjs/common';
import { UsersService } from './users.service';
import { AddContactDto } from './dto/add-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { EditUserDto } from './dto/edit-user.dto';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProfile(@Request() req) {
    try {
      return await this.usersService.getMyProfile(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }
@UseGuards(JwtAuthGuard)
@Get('me/groups')
async getUserGroups(@Request() req) {
  try {
    return await this.usersService.getUserGroups(req.user.userId);
  } catch (error) {
    throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
  }
}
  @UseGuards(JwtAuthGuard)
  @Put('me')
  async editUser(@Request() req, @Body() dto: EditUserDto) {
    try {
      return await this.usersService.editUser(req.user.userId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/contacts')
  async addContact(@Request() req, @Body() dto: AddContactDto) {
    try {
      return await this.usersService.addContact(req.user.userId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/contacts')
  async getContacts(@Request() req) {
    try {
      return await this.usersService.getContacts(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/contacts/:userId')
  async updateContact(@Request() req, @Param('userId') contactId: string, @Body() dto: UpdateContactDto) {
    try {
      return await this.usersService.updateContact(req.user.userId, contactId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/contacts/:userId')
  async removeContact(@Request() req, @Param('id') contactId: string) {
    try {
      return await this.usersService.removeContact(req.user.userId, contactId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async searchUsers(@Request() req, @Query('query') query: string) {
    try {
      return await this.usersService.searchUsers(query, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUser(@Request() req, @Param('id') id: string) {
    try {
      return await this.usersService.getUserById(id, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }
}
