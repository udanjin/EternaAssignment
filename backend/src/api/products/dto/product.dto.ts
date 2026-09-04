import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0, { message: 'Price cannot be negative' })
  unitPrice!: number;

  @IsInt()
  @Min(0, { message: 'Quantity cannot be negative' })
  quantityOnHand!: number;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0, { message: 'Price cannot be negative' })
  @IsOptional()
  unitPrice?: number;

  @IsInt()
  @Min(0, { message: 'Quantity cannot be negative' })
  @IsOptional()
  quantityOnHand?: number;
}
