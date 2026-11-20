/** GET /api/suppliers yanıtındaki bir kayıt */
export interface Supplier {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  taxNumber: string;
  purchaseOrderCount: number;
  createdAt: string;
  updatedAt: string;
}

/** POST ve PUT gövdesi. address: null gönderilirse adres silinir. */
export interface SupplierInput {
  name: string;
  email: string;
  phone: string;
  address?: string | null;
  taxNumber: string;
}