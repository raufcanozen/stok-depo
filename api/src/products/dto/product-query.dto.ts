import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

const SORT_FIELDS = ['id', 'name', 'sku', 'price', 'stock', 'createdAt'] as const;

export class ProductQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(SORT_FIELDS, { message: `sortBy şunlardan biri olmalı: ${SORT_FIELDS.join(', ')}` })
  sortBy: (typeof SORT_FIELDS)[number] = 'createdAt';
}