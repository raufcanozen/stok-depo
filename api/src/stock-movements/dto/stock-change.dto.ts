import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';


export class StockChangeDto {
  /** Kaç adet eklenecek / çıkarılacak @example 10 */
  @IsInt({ message: 'quantity tam sayı olmalı' })
  @Min(1, { message: 'quantity en az 1 olmalı' })
  @Max(1_000_000, { message: 'quantity en fazla 1.000.000 olabilir' })
  quantity: number;

  
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  note?: string;
}