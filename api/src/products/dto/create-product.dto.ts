import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** SKU kuralı: büyük harf/rakam blokları, aralarında tek tire. Ör: MOUSE-001, PAPER-A4 */
const SKU_PATTERN = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

export class CreateProductDto {
  /** @example 'Kablosuz Mouse' */
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Ürün adı boş olamaz' })
  @MaxLength(150)
  name: string;

  /** Stok kodu. Küçük harfle gönderilirse büyük harfe çevrilir. @example 'MOUSE-002' */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(50)
  @Matches(SKU_PATTERN, {
    message: 'SKU yalnızca harf, rakam ve tek tirelerden oluşmalı (ör. MOUSE-001)',
  })
  sku: string;

  /** @example '2.4 GHz, sessiz tıklama' */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string;

  /** @example 1 */
  @IsInt({ message: 'categoryId tam sayı olmalı' })
  @Min(1, { message: 'categoryId geçersiz' })
  categoryId: number;

  /** @example 1 */
  @IsInt({ message: 'warehouseId tam sayı olmalı' })
  @Min(1, { message: 'warehouseId geçersiz' })
  warehouseId: number;

  /** Başlangıç stoğu. Sonraki değişiklikler stok artırma/azaltma ile yapılır. @example 100 */
  @IsOptional()
  @IsInt({ message: 'stock tam sayı olmalı' })
  @Min(0, { message: 'stock negatif olamaz' })
  stock?: number;

  
  @IsOptional()
  @IsInt({ message: 'criticalStock tam sayı olmalı' })
  @Min(0, { message: 'criticalStock negatif olamaz' })
  criticalStock?: number;

  /** Birim fiyat (TL, en fazla 2 ondalık) @example 349.9 */
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price en fazla 2 ondalıklı bir sayı olmalı' })
  @Min(0, { message: 'price negatif olamaz' })
  @Max(99999999.99, { message: 'price en fazla 99999999.99 olabilir' })
  price: number;
}