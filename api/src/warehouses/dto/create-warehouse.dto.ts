import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateWarehouseDto {
  /** @example 'İzmir Depo' */
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Depo adı boş olamaz' })
  @MaxLength(100)
  name: string;

  /** Adres veya bölge @example 'Kemalpaşa, İzmir' */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  location?: string;

  /** Depo kapasitesi (adet) @example 8000 */
  @IsOptional()
  @IsInt({ message: 'capacity tam sayı olmalı' })
  @Min(1, { message: 'capacity en az 1 olmalı' })
  capacity?: number;
}