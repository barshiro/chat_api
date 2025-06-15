import { IsString, IsOptional, IsHexColor, IsObject } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsObject()
  permissions?: {
    sendMessages?: boolean;
    manageMessages?: boolean;
    manageRoles?: boolean;
    manageChannels?: boolean;
    kickMembers?: boolean;
    banMembers?: boolean;
    mentionEveryone?: boolean;
    attachFiles?: boolean;
    voiceChat?: boolean;
  };
}