export class PaginationMetaDto {
  /** @example 1 */
  page: number;
  /** @example 10 */
  limit: number;
  /** Filtreye uyan toplam kayıt sayısı @example 42 */
  total: number;
  /** @example 5 */
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Swagger için: yalnızca "meta" alanını tanımlar.
 * "data" alanını @ApiPaginatedResponse(Model) decorator'ı her endpoint için ayrıca ekler.
 */
export class PaginatedResponseDto {
  meta: PaginationMetaDto;
}

/** Kod içinde kullanılan tip: tüm liste endpoint'lerinin yanıtı { data: [...], meta: {...} } */
export interface Paginated<T> {
  data: T[];
  meta: PaginationMetaDto;
}