/** Backend'deki Paginated<T>: tüm liste endpoint'lerinin yanıtı */
export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/** Tüm liste endpoint'lerinde ortak sorgu parametreleri (PaginationQueryDto) */
export interface ListQuery {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

/** Boş değerleri atarak HttpClient'ın params seçeneğine çevirir */
export function toParams(query: object): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}