export class CategoryResponseDto {
  id: number;
  name: string;
  description: string | null;
  /** Bu kategorideki ürün sayısı */
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}