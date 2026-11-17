import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { PurchaseOrderStatus } from '../../generated/prisma/enums.js';

/** PENDING başlangıç durumudur; bir siparişi PENDING'e geri almak mümkün değil */
const TARGET_STATUSES = [
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.RECEIVED,
  PurchaseOrderStatus.CANCELLED,
] as const;

export class UpdatePurchaseOrderStatusDto {
  @ApiProperty({ enum: TARGET_STATUSES, example: PurchaseOrderStatus.APPROVED })
  @IsIn(TARGET_STATUSES, { message: `status şunlardan biri olmalı: ${TARGET_STATUSES.join(', ')}` })
  status: (typeof TARGET_STATUSES)[number];
}