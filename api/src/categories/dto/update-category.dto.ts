import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto.js';

/** CreateCategoryDto'daki tüm alanlar, aynı kurallarla ama opsiyonel olarak */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}