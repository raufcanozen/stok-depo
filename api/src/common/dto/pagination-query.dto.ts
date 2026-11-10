import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Tüm liste endpoint'lerinde ortak sorgu parametreleri:
 *   ?page=2&limit=20&search=mouse&order=desc
 * Modüller bunu "extends" ile genişletip kendi filtrelerini ve sortBy alanını ekler.
 */
export class PaginationQueryDto {
  /** Sayfa numarası (1'den başlar) @example 1 */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page tam sayı olmalı' })
  @Min(1, { message: 'page en az 1 olmalı' })
  page: number = 1;

  /** Sayfa başına kayıt sayısı (en fazla 100) @example 10 */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit tam sayı olmalı' })
  @Min(1, { message: 'limit en az 1 olmalı' })
  @Max(100, { message: 'limit en fazla 100 olabilir' })
  limit: number = 10;

  /** Metin araması (büyük/küçük harf duyarsız) */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;

  /** Sıralama yönü */
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: "order 'asc' veya 'desc' olmalı" })
  order: 'asc' | 'desc' = 'desc';
}