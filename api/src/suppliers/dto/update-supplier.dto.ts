import { PartialType } from '@nestjs/swagger';
import { CreateSupplierDto } from './create-supplier.dto.js';

/** CreateSupplierDto'daki tüm alanlar, aynı kurallarla ama opsiyonel olarak */
export class UpdateSupplierDto extends PartialType(CreateSupplierDto, {
  skipNullProperties: false,
}) {}