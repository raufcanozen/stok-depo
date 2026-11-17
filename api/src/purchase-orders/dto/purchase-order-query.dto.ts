import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { PurchaseOrderStatus } from '../../generated/prisma/enums.js';

const SORT_FIELDS = ['id', 'createdAt', 'totalAmount', 'expectedDate'] as const;

export class PurchaseOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PurchaseOrderStatus, enumName: 'PurchaseOrderStatus' })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus, {
    message: `status şunlardan biri olmalı: ${Object.values(PurchaseOrderStatus).join(', ')}`,
  })
  status?: PurchaseOrderStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'supplierId tam sayı olmalı' })
  @Min(1, { message: 'supplierId geçersiz' })
  supplierId?: number;

  @IsOptional()
  @IsIn(SORT_FIELDS, { message: `sortBy şunlardan biri olmalı: ${SORT_FIELDS.join(', ')}` })
  sortBy: (typeof SORT_FIELDS)[number] = 'createdAt';
}