import { IsString, IsNotEmpty, IsOptional, IsHexColor, IsObject } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsObject()
  permissions: {
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