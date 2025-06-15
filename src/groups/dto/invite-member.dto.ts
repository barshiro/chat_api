import { IsString, IsNotEmpty } from 'class-validator';

export class InviteMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  roleId: string; // Роль для приглашенного участника
}