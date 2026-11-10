import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

const SORT_FIELDS = ['id', 'name', 'createdAt'] as const;

/** GET /categories?page=1&limit=10&search=elek&sortBy=name&order=asc */
export class CategoryQueryDto extends PaginationQueryDto {
  /** Sıralama alanı */
  @IsOptional()
  @IsIn(SORT_FIELDS, { message: `sortBy şunlardan biri olmalı: ${SORT_FIELDS.join(', ')}` })
  sortBy: (typeof SORT_FIELDS)[number] = 'createdAt';
}