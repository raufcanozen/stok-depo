import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

const SORT_FIELDS = ['id', 'name', 'capacity', 'createdAt'] as const;

/** GET /warehouses?page=1&limit=10&search=ankara&sortBy=name&order=asc */
export class WarehouseQueryDto extends PaginationQueryDto {
  /** Sıralama alanı */
  @IsOptional()
  @IsIn(SORT_FIELDS, { message: `sortBy şunlardan biri olmalı: ${SORT_FIELDS.join(', ')}` })
  sortBy: (typeof SORT_FIELDS)[number] = 'createdAt';
}