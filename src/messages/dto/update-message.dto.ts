import { IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FormatDto {
  @IsOptional()
  @IsArray()
  bold?: { start: number; end: number }[];

  @IsOptional()
  @IsArray()
  italic?: { start: number; end: number }[];

  @IsOptional()
  @IsArray()
  links?: { start: number; end: number; url: string }[];

  @IsOptional()
  @IsArray()
  mentions?: { start: number; end: number; userId: string }[];
}

export class UpdateMessageDto {
  @IsOptional()
  @IsEnum(['text', 'voice', 'image', 'video', 'file', 'poll'])
  type?: string;

  @IsOptional()
  @IsString()
  payload?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FormatDto)
  format?: FormatDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsString()
  replyTo?: string;
}