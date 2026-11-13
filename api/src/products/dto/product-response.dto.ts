/** Ürünle birlikte dönen kısa kategori/depo bilgisi */
export class ProductRelationDto {
  id: number;
  name: string;
}

export class ProductResponseDto {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  categoryId: number;
  warehouseId: number;
  stock: number;
  criticalStock: number;
  price: number;
  category: ProductRelationDto;
  warehouse: ProductRelationDto;
  createdAt: Date;
  updatedAt: Date;
}