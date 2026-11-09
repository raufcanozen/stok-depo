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
  /** Token'ın geçerlilik süresi @example '15m' */
  expiresIn: string;
  user: UserResponseDto;
}