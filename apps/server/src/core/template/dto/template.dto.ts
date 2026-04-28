import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';

export class ListTemplatesDto extends PaginationOptions {
  @IsOptional()
  @IsUUID()
  spaceId?: string;
}

export class TemplateIdDto {
  @IsUUID()
  templateId: string;
}

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  content?: object;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsUUID()
  spaceId?: string;
}

export class UpdateTemplateDto {
  @IsUUID()
  templateId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  content?: object | null;

  @IsOptional()
  @IsString()
  icon?: string | null;

  @IsOptional()
  @IsUUID()
  spaceId?: string | null;
}

export class UseTemplateDto {
  @IsUUID()
  templateId: string;

  @IsUUID()
  spaceId: string;

  @IsOptional()
  @IsUUID()
  parentPageId?: string;
}
