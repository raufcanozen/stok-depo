import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  /** @example 'admin@stokdepo.com' */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin' })
  email: string;

  /** @example 'Sifre123!' */
  @IsString()
  @IsNotEmpty({ message: 'Şifre boş olamaz' })
  password: string;
}
