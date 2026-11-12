export class SupplierResponseDto {
  id: number;
  name: string;
  email: string;
  phone: string;  
  address: string | null;
  taxNumber: string;
  /** Bu tedarikçiye verilmiş satın alma siparişi sayısı */
  purchaseOrderCount: number;
  createdAt: Date;
  updatedAt: Date;
}