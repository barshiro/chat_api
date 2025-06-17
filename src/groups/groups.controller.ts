import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request, HttpStatus, HttpException, Query } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('groups')
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createGroup(@Request() req, @Body() dto: CreateGroupDto) {
    try {
      return await this.groupsService.createGroup(req.user.userId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }
@UseGuards(JwtAuthGuard)
@Get(':id/messages')
async getMessages(
  @Request() req,
  @Param('id') groupId: string,
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 50
) {
  try {
    return await this.groupsService.getGroupMessages(groupId, req.user.userId, page, limit);
  } catch (error) {
    throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
  }
}
  @UseGuards(JwtAuthGuard)
  @Post(':id/invite')
  async inviteMember(@Request() req, @Param('id') groupId: string, @Body() dto: InviteMemberDto) {
    try {
      return await this.groupsService.inviteMember(req.user.userId, groupId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  async joinGroup(@Request() req, @Param('id') groupId: string, @Body() dto: JoinGroupDto) {
    try {
      return await this.groupsService.joinGroup(req.user.userId, groupId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/roles')
  async createRole(@Request() req, @Param('id') groupId: string, @Body() dto: CreateRoleDto) {
    try {
      return await this.groupsService.createRole(req.user.userId, groupId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/roles/:roleId')
  async updateRole(@Request() req, @Param('id') groupId: string, @Param('roleId') roleId: string, @Body() dto: UpdateRoleDto) {
    try {
      return await this.groupsService.updateRole(req.user.userId, groupId, roleId, dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/roles/:roleId')
  async deleteRole(@Request() req, @Param('id') groupId: string, @Param('roleId') roleId: string) {
    try {
      return await this.groupsService.deleteRole(req.user.userId, groupId, roleId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/members')
  async getMembers(@Request() req, @Param('id') groupId: string) {
    try {
      return await this.groupsService.getMembers(groupId, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/members/:userId')
  async removeMember(@Request() req, @Param('id') groupId: string, @Param('userId') targetUserId: string) {
    try {
      return await this.groupsService.removeMember(req.user.userId, groupId, targetUserId);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }
}
