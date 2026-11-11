import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';

/** Yalnızca gönderilmeyen alan (undefined) atlanır; null gönderilirse doğrulanır ve reddedilir */
const IsOptionalNotNull = () => ValidateIf((_, value) => value !== undefined);

/** Tüm alanlar opsiyonel: yalnızca gönderilen alanlar güncellenir */
export class UpdateUserDto {
  @IsOptionalNotNull()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Ad soyad boş olamaz' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: Role, enumName: 'Role', example: Role.WAREHOUSE_MANAGER })
  @IsOptionalNotNull()
  @IsEnum(Role, { message: `role şunlardan biri olmalı: ${Object.values(Role).join(', ')}` })
  role?: Role;

  @IsOptionalNotNull()
  @IsBoolean({ message: 'isActive true veya false olmalı' })
  isActive?: boolean;
}