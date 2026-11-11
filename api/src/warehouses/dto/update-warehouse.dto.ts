import { PartialType } from '@nestjs/swagger';
import { CreateWarehouseDto } from './create-warehouse.dto.js';

/** CreateWarehouseDto'daki tüm alanlar, aynı kurallarla ama opsiyonel olarak */
export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {}