import { IsOptional, IsString } from 'class-validator';

export class JoinGroupDto {
  @IsOptional()
  @IsString()
  notificationId?: string; // ID уведомления, если требуется указать конкретное
}