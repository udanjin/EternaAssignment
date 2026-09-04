import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class InvoiceLineItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity!: number;
}

export class CreateInvoiceDto {
  @IsString()
  customerName!: string;

  @IsDateString()
  issueDate!: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  items!: InvoiceLineItemDto[];
}

export class UpdateInvoiceDto {
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  @IsOptional()
  items?: InvoiceLineItemDto[];
}

export class InvoiceQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  status?: string;
}
