import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

const SORT_FIELDS = ['id', 'name', 'sku', 'price', 'stock', 'createdAt'] as const;

/** GET /products?search=mouse&categoryId=1&warehouseId=2&lowStock=true&sortBy=stock&order=asc */
export class ProductQueryDto extends PaginationQueryDto {
  /** Yalnızca bu kategorideki ürünler */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'categoryId tam sayı olmalı' })
  @Min(1, { message: 'categoryId geçersiz' })
  categoryId?: number;

  /** Yalnızca bu depodaki ürünler */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'warehouseId tam sayı olmalı' })
  @Min(1, { message: 'warehouseId geçersiz' })
  warehouseId?: number;

  /** true: stoğu kritik seviyede veya altında olanlar (stock <= criticalStock), false: diğerleri */
  @IsOptional()
  // URL'den "true"/"false" METİN olarak gelir; gerçek boolean'a çeviriyoruz
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean({ message: 'lowStock true veya false olmalı' })
  lowStock?: boolean;

  @IsOptional()
  @IsIn(SORT_FIELDS, { message: `sortBy şunlardan biri olmalı: ${SORT_FIELDS.join(', ')}` })
  sortBy: (typeof SORT_FIELDS)[number] = 'createdAt';
}