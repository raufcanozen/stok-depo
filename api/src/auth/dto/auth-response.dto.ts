import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums.js';

export class UserResponseDto {
  id: number;
  name: string;
  email: string;
  @ApiProperty({ enum: Role, enumName: 'Role' })
  role: Role;
  isActive: boolean;
  createdAt: Date;
}

export class AuthResponseDto {
  /** İsteklerde "Authorization: Bearer <token>" başlığıyla gönderilecek JWT */
  accessToken: string;
  /** Access token'ın geçerlilik süresi @example '15m' */
  expiresIn: string;
  /** Access token süresi dolunca yenisini almak için kullanılır (POST /auth/refresh-token) */
  refreshToken: string;
  /** Refresh token'ın son geçerlilik zamanı */
  refreshTokenExpiresAt: Date;
  user: UserResponseDto;
}