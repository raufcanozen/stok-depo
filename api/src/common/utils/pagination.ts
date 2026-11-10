import type { Paginated } from '../dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../dto/pagination-query.dto.js';

/** Prisma'nın findMany'sine verilecek skip/take değerleri */
export function toSkipTake(query: PaginationQueryDto): { skip: number; take: number } {
  return { skip: (query.page - 1) * query.limit, take: query.limit };
}

/** Veri + toplam sayıdan ortak yanıt şeklini oluşturur */
export function toPaginated<T>(
  data: T[],
  total: number,
  query: PaginationQueryDto,
): Paginated<T> {
  const totalPages = Math.ceil(total / query.limit);
  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPrevPage: query.page > 1,
    },
  };
}