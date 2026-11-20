/** GET /api/warehouses yanıtındaki bir kayıt */
export interface Warehouse {
  id: number;
  name: string;
  location: string | null;
  capacity: number | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

/** POST ve PUT gövdesi. null gönderilen opsiyonel alan silinir. */
export interface WarehouseInput {
  name: string;
  location?: string | null;
  capacity?: number | null;
}