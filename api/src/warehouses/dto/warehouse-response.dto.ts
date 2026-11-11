export class WarehouseResponseDto {
  id: number;
  name: string;
  location: string | null;
  capacity: number | null;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}