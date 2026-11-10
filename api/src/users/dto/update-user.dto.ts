import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';

/** Tüm alanlar opsiyonel: yalnızca gönderilen alanlar güncellenir */
export class UpdateUserDto {
  
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Ad soyad boş olamaz' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: Role, enumName: 'Role', example: Role.WAREHOUSE_MANAGER })
  @IsOptional()
  @IsEnum(Role, { message: `role şunlardan biri olmalı: ${Object.values(Role).join(', ')}` })
  role?: Role;

  @IsOptional()
  @IsBoolean({ message: 'isActive true veya false olmalı' })
  isActive?: boolean;
}