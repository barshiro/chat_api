import { Controller, Post, Patch, Delete, Body, Param, UseGuards, Request, HttpStatus, HttpException } from '@nestjs/common';
import { MessagesService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller()
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('groups/:id/messages')
  async createMessage(@Request() req, @Param('id') groupId: string, @Body() dto: CreateMessageDto) {
    try {
      return await this.messagesService.createMessage(req.user.userId, groupId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('messages/:id')
  async updateMessage(@Request() req, @Param('id') messageId: string, @Body() dto: UpdateMessageDto) {
    try {
      return await this.messagesService.updateMessage(req.user.userId, messageId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('messages/:id')
  async deleteMessage(@Request() req, @Param('id') messageId: string) {
    try {
      return await this.messagesService.deleteMessage(req.user.userId, messageId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('messages/:id/reactions')
  async createReaction(@Request() req, @Param('id') messageId: string, @Body() dto: CreateReactionDto) {
    try {
      return await this.messagesService.createReaction(req.user.userId, messageId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }
}