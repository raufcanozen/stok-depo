import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RegisterDto } from '../../auth/dto/register.dto.js';
import { Role } from '../../generated/prisma/enums.js';

/** Admin'in kullanıcı oluşturması: kayıt bilgileri + roles */
export class CreateUserDto extends RegisterDto {
  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.STAFF })
  @IsEnum(Role, { message: `role şunlardan biri olmalı: ${Object.values(Role).join(', ')}` })
  role: Role;
}