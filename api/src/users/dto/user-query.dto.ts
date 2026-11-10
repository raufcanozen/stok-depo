import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Role } from '../../generated/prisma/enums.js';

const SORT_FIELDS = ['id', 'name', 'email', 'createdAt'] as const;

/** GET /users?search=ahmet&role=STAFF&isActive=true&page=1 */
export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Role, enumName: 'Role' })
  @IsOptional()
  @IsEnum(Role, { message: `role şunlardan biri olmalı: ${Object.values(Role).join(', ')}` })
  role?: Role;

  /** Yalnızca aktif (true) veya pasif (false) kullanıcılar */
  @IsOptional()
  // URL'den "true"/"false" METİN olarak gelir; gerçek boolean'a çeviriyoruz
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean({ message: 'isActive true veya false olmalı' })
  isActive?: boolean;

  /** Sıralama alanı */
  @IsOptional()
  @IsIn(SORT_FIELDS, { message: `sortBy şunlardan biri olmalı: ${SORT_FIELDS.join(', ')}` })
  sortBy: (typeof SORT_FIELDS)[number] = 'id';
}