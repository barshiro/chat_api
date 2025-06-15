import { IsString, IsNotEmpty } from 'class-validator';

export class CreateReactionDto {
  @IsString()
  @IsNotEmpty()
  reaction: string; // e.g., "👍", "heart", "smile"
}