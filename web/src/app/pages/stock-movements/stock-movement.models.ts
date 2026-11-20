import { ListQuery } from '../../core/http/paginated';

/** Backend'deki MovementType enum'ı */
export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

/** Arayüzde gösterilecek hareket türü adları */
export const MOVEMENT_LABELS: Record<MovementType, string> = {
  IN: 'Giriş',
  OUT: 'Çıkış',
  ADJUSTMENT: 'Sayım düzeltmesi',
};

/** GET /api/stock-movements yanıtındaki bir kayıt */
export interface StockMovement {
  id: number;
  productId: number;
  userId: number;
  purchaseOrderId: number | null;
  type: MovementType;
  /** Giriş/çıkışta miktar; sayımda eski ve yeni stok arasındaki farkın büyüklüğü */
  quantity: number;
  previousStock: number;
  newStock: number;
  note: string | null;
  product: { id: number; name: string; sku: string };
  user: { id: number; name: string };
  purchaseOrder: { id: number; orderNumber: string } | null;
  createdAt: string;
}

/** GET /api/products/:id/stock yanıtı */
export interface ProductStock {
  product: { id: number; name: string; sku: string };
  stock: number;
  criticalStock: number;
  isLowStock: boolean;
  lastMovementAt: string | null;
}

/** POST /products/:id/stock/increase ve /decrease gövdesi */
export interface StockChangeInput {
  quantity: number;
  note?: string;
}

/** GET /api/stock-movements sorgusu */
export interface StockMovementQuery extends ListQuery {
  productId?: number;
  type?: MovementType;
  startDate?: string;
  endDate?: string;
}