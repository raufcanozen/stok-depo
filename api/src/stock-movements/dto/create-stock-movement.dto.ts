import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MovementType } from '../../generated/prisma/enums.js';

/** POST /stock-movements: tek endpoint'ten giriş, çıkış veya sayım düzeltmesi */
export class CreateStockMovementDto {
  /** @example 1 */
  @IsInt({ message: 'productId tam sayı olmalı' })
  @Min(1, { message: 'productId geçersiz' })
  productId: number;

  @ApiProperty({ enum: MovementType, enumName: 'MovementType', example: MovementType.IN })
  @IsEnum(MovementType, {
    message: `type şunlardan biri olmalı: ${Object.values(MovementType).join(', ')}`,
  })
  type: MovementType;

  /**
   * IN/OUT: eklenecek veya çıkarılacak miktar (en az 1).
   * ADJUSTMENT: sayımda bulunan GERÇEK stok (0 olabilir); fark otomatik hesaplanır.
   * @example 10
   */
  @IsInt({ message: 'quantity tam sayı olmalı' })
  @Min(0, { message: 'quantity negatif olamaz' })
  @Max(1_000_000, { message: 'quantity en fazla 1.000.000 olabilir' })
  quantity: number;

  /** @example 'Yıl sonu sayımı' */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  note?: string;
}