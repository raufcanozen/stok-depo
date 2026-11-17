import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Siparişteki tek bir satır: hangi üründen, kaç adet, hangi fiyattan */
export class PurchaseOrderItemDto {
  /** @example 1 */
  @IsInt({ message: 'productId tam sayı olmalı' })
  @Min(1, { message: 'productId geçersiz' })
  productId: number;

  /** @example 50 */
  @IsInt({ message: 'quantity tam sayı olmalı' })
  @Min(1, { message: 'quantity en az 1 olmalı' })
  @Max(100_000, { message: 'quantity en fazla 100.000 olabilir' })
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'unitPrice en fazla 2 ondalıklı bir sayı olmalı' })
  @Min(0, { message: 'unitPrice negatif olamaz' })
  @Max(99999999.99, { message: 'unitPrice en fazla 99999999.99 olabilir' })
  unitPrice: number;
}

export class CreatePurchaseOrderDto {
  /** @example 1 */
  @IsInt({ message: 'supplierId tam sayı olmalı' })
  @Min(1, { message: 'supplierId geçersiz' })
  supplierId: number;

  @IsOptional()
  @IsDateString({ strict: true }, { message: 'expectedDate YYYY-AA-GG formatında olmalı' })
  @MaxLength(10, { message: 'expectedDate YYYY-AA-GG formatında olmalı' })
  expectedDate?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsArray({ message: 'items bir dizi olmalı' })
  @ArrayMinSize(1, { message: 'Siparişte en az bir ürün olmalı' })
  @ArrayMaxSize(100, { message: 'Bir siparişte en fazla 100 kalem olabilir' })
  @ArrayUnique((item: PurchaseOrderItemDto) => item.productId, {
    message: 'Aynı ürün siparişte birden fazla kez olamaz; miktarı artırın',
  })
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}