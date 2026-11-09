import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {

  @IsString()
  @IsNotEmpty({ message: 'refreshToken bos olamaz' })
  refreshToken: string;
}