import { ListQuery } from '../../core/http/paginated';

/** GET /api/products yanıtındaki bir kayıt */
export interface Product {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  categoryId: number;
  warehouseId: number;
  stock: number;
  criticalStock: number;
  price: number;
  category: { id: number; name: string };
  warehouse: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
}

/** POST gövdesi. stock yalnızca eklemede gönderilir (başlangıç stoğu). */
export interface ProductInput {
  name: string;
  sku: string;
  description?: string | null;
  categoryId: number;
  warehouseId: number;
  price: number;
  criticalStock?: number;
  stock?: number;
}

/** GET /api/products sorgusu: ortak liste parametreleri + ürün filtreleri */
export interface ProductQuery extends ListQuery {
  categoryId?: number;
  warehouseId?: number;
  lowStock?: boolean;
}