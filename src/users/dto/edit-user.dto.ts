import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUrl, MinLength } from 'class-validator';

export class EditUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  displayName: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  profileLink?: string;

  @IsString()
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsOptional()
  settings?: {
    notifications?: {
      global?: 'all' | 'mentions' | 'none';
      groupChats?: 'all' | 'mentions' | 'none';
      privateChats?: 'all' | 'none';
    };
    privacy?: {
      profileVisibility?: 'public' | 'friends' | 'private';
      onlineStatus?: 'show' | 'hide';
      lastSeen?: 'show' | 'hide';
    };
    theme?: 'light' | 'dark' | 'system';
  };
}