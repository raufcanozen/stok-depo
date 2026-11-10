import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCategoryDto {
  /** @example 'Elektronik' */
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Kategori adı boş olamaz' })
  @MaxLength(100)
  name: string;

  /** @example 'Bilgisayar ve çevre birimleri' */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string;
}