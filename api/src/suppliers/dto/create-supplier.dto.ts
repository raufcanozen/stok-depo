import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateSupplierDto {
  /** @example 'Anadolu Elektronik Ltd.' */
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Tedarikçi adı boş olamaz' })
  @MaxLength(150)
  name: string;

  /** @example 'satis@anadoluelektronik.com' */
  @Transform(trim)
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin' })
  @MaxLength(255)
  email: string;

  /** @example '0232 555 30 30' */
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Telefon boş olamaz' })
  @MaxLength(30)
  phone: string;

  /** @example 'Atatürk OSB, Çiğli, İzmir' */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  address?: string;

  /** Vergi numarası (10 hane) veya TC kimlik numarası (11 hane) @example '1112223334' */
  @Transform(trim)
  @Matches(/^\d{10,11}$/, { message: 'taxNumber 10 veya 11 haneli, yalnızca rakamlardan oluşmalı' })
  taxNumber: string;
}