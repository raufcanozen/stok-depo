import { ApiProperty } from '@nestjs/swagger';
import { MovementType } from '../../generated/prisma/enums.js';

export class MovementProductDto {
  id: number;
  name: string;
  sku: string;
}

export class MovementUserDto {
  id: number;
  name: string;
}

export class MovementPurchaseOrderDto {
  id: number;
  orderNumber: string;
}

export class StockMovementResponseDto {
  id: number;
  productId: number;
  /** Hareketi yapan kullanıcı */
  userId: number;
  /** Siparişten gelen hareketlerde dolu (Gün 16) */
  purchaseOrderId: number | null;

  @ApiProperty({ enum: MovementType, enumName: 'MovementType' })
  type: MovementType;

  quantity: number;
  /** Hareketten önceki stok */
  previousStock: number;
  /** Hareketten sonraki stok */
  newStock: number;
  note: string | null;
  product: MovementProductDto;
  user: MovementUserDto;
  purchaseOrder: MovementPurchaseOrderDto | null;
  createdAt: Date;
  updatedAt: Date;
}