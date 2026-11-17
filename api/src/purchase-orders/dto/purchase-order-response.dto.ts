import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '../../generated/prisma/enums.js';

export class OrderRelationDto {
  id: number;
  name: string;
}

export class OrderItemProductDto {
  id: number;
  name: string;
  sku: string;
}

export class PurchaseOrderItemResponseDto {
  id: number;
  productId: number;
  product: OrderItemProductDto;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/** Liste satırı */
export class PurchaseOrderResponseDto {
  id: number;
  /** @example 'PO-2026-00001' */
  orderNumber: string;

  @ApiProperty({ enum: PurchaseOrderStatus, enumName: 'PurchaseOrderStatus' })
  status: PurchaseOrderStatus;

  supplier: OrderRelationDto;
  
  createdBy: OrderRelationDto;
  
  totalAmount: number;
  
  itemCount: number;
  /** @example '2026-11-30' */
  expectedDate: string | null;
  receivedAt: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}


export class PurchaseOrderDetailResponseDto extends PurchaseOrderResponseDto {
  items: PurchaseOrderItemResponseDto[];
}