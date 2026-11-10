import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Paginated } from '../common/dto/paginated-response.dto.js';
import { toPaginated, toSkipTake } from '../common/utils/pagination.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CategoryQueryDto } from './dto/category-query.dto.js';
import { CategoryResponseDto } from './dto/category-response.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

/** Her sorguda ürün sayısını da getir */
const withProductCount = { _count: { select: { products: true } } } satisfies Prisma.CategoryInclude;
type CategoryWithCount = Prisma.CategoryGetPayload<{ include: typeof withProductCount }>;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: CategoryQueryDto): Promise<Paginated<CategoryResponseDto>> {
    const where: Prisma.CategoryWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    // Liste ve toplam sayıyı TEK transaction'da al (ikisi aynı anı yansıtsın)
    const [categories, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        include: withProductCount,
        orderBy: { [query.sortBy]: query.order },
        ...toSkipTake(query),
      }),
      this.prisma.category.count({ where }),
    ]);

    return toPaginated(categories.map(toResponse), total, query);
  }

  async findOne(id: number): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: withProductCount,
    });
    if (!category) {
      throw new NotFoundException(`${id} numaralı kategori bulunamadı`);
    }
    return toResponse(category);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    // Aynı isimde kategori varsa veritabanı unique hatası → filtre 409 döndürür
    const category = await this.prisma.category.create({ data: dto, include: withProductCount });
    return toResponse(category);
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    await this.findOne(id); // yoksa anlaşılır bir 404 mesajı
    const category = await this.prisma.category.update({
      where: { id },
      data: dto,
      include: withProductCount,
    });
    return toResponse(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);
    // Veritabanı zaten engeller (onDelete: Restrict); burada daha açıklayıcı bir mesaj veriyoruz
    if (category.productCount > 0) {
      throw new ConflictException(
        `Bu kategoride ${category.productCount} ürün var. Önce ürünleri başka bir kategoriye taşıyın.`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
  }
}

function toResponse({ _count, ...category }: CategoryWithCount): CategoryResponseDto {
  return { ...category, productCount: _count.products };
}