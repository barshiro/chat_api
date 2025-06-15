import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUrl, IsInt, Min } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['private', 'public', 'channel'])
  type: 'private' | 'public' | 'channel';

  @IsString()
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsEnum(['open', 'approval', 'invite'])
  @IsOptional()
  joinMode?: 'open' | 'approval' | 'invite';

  @IsEnum(['all', 'moderators'])
  @IsOptional()
  messagePermissions?: 'all' | 'moderators';

  @IsInt()
  @Min(0)
  @IsOptional()
  slowMode?: number;
}