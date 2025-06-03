import { IsString, IsIn } from 'class-validator';

export class UpdateContactDto {
  @IsString()
  @IsIn(['pending', 'accepted', 'rejected'])
  status: string;
}