import { IsString, IsNotEmpty } from 'class-validator';

export class AddContactDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}