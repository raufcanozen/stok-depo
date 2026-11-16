import { MovementProductDto } from './stock-movement-response.dto.js';

/** GET /products/:id/stock */
export class ProductStockResponseDto {
  product: MovementProductDto;
  stock: number;
  criticalStock: number;
  /** stock <= criticalStock */
  isLowStock: boolean;
  /** Son stok hareketinin zamanı; hiç hareket yoksa null */
  lastMovementAt: Date | null;
}