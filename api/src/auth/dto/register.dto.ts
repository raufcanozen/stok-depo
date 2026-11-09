import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Ad soyad boş olamaz' })
  @MaxLength(100)
  name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin' })
  @MaxLength(255)
  email: string;

  /**
   * En az 8 karakter; en az bir harf ve bir rakam içermeli
   * @example 'Sifre123!'
   */
  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalı' })
  @MaxLength(72, { message: 'Şifre en fazla 72 karakter olabilir' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, { message: 'Şifre en az bir harf ve bir rakam içermeli' })
  password: string;
}