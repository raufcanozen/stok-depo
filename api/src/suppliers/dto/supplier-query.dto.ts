import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

const SORT_FIELDS = ['id', 'name', 'createdAt'] as const;

/** GET /suppliers?page=1&limit=10&search=teknoloji&sortBy=name&order=asc */
export class SupplierQueryDto extends PaginationQueryDto {
  /** Sıralama alanı */
  @IsOptional()
  @IsIn(SORT_FIELDS, { message: `sortBy şunlardan biri olmalı: ${SORT_FIELDS.join(', ')}` })
  sortBy: (typeof SORT_FIELDS)[number] = 'createdAt';
}