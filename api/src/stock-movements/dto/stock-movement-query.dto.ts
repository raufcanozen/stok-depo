import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { MovementType } from '../../generated/prisma/enums.js';

const SORT_FIELDS = ['id', 'quantity', 'createdAt'] as const;

/** GET /stock-movements?productId=1&type=OUT&startDate=...&endDate=...&search=mouse */
export class StockMovementQueryDto extends PaginationQueryDto {
  /** Yalnızca bu ürünün hareketleri */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'productId tam sayı olmalı' })
  @Min(1, { message: 'productId geçersiz' })
  productId?: number;

  @ApiPropertyOptional({ enum: MovementType, enumName: 'MovementType' })
  @IsOptional()
  @IsEnum(MovementType, {
    message: `type şunlardan biri olmalı: ${Object.values(MovementType).join(', ')}`,
  })
  type?: MovementType;

  /** Bu andan itibaren (dahil) @example '2026-11-01T00:00:00+03:00' */
  @IsOptional()
  @IsDateString({}, { message: 'startDate geçerli bir tarih olmalı (ISO 8601)' })
  startDate?: string;

  /** Bu ana kadar (dahil) @example '2026-11-30T23:59:59+03:00' */
  @IsOptional()
  @IsDateString({}, { message: 'endDate geçerli bir tarih olmalı (ISO 8601)' })
  endDate?: string;

  @IsOptional()
  @IsIn(SORT_FIELDS, { message: `sortBy şunlardan biri olmalı: ${SORT_FIELDS.join(', ')}` })
  sortBy: (typeof SORT_FIELDS)[number] = 'createdAt';
}