import { Injectable, NotFoundException } from '@nestjs/common';
import type { Paginated } from '../common/dto/paginated-response.dto.js';
import { toPaginated, toSkipTake } from '../common/utils/pagination.js';
import { Prisma } from '../generated/prisma/client.js';
import { MovementType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ProductQueryDto } from './dto/product-query.dto.js';
import { ProductResponseDto } from './dto/product-response.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

/** Her sorguda kategori ve depo adını da getir */
const withRelations = {
  category: { select: { id: true, name: true } },
  warehouse: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;
type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof withRelations }>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto): Promise<Paginated<ProductResponseDto>> {
    const where: Prisma.ProductWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { sku: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: withRelations,
        orderBy: { [query.sortBy]: query.order },
        ...toSkipTake(query),
      }),
      this.prisma.product.count({ where }),
    ]);

    return toPaginated(products.map(toResponse), total, query);
  }

  async findOne(id: number): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({ where: { id }, include: withRelations });
    if (!product) {
      throw new NotFoundException(`${id} numaralı ürün bulunamadı`);
    }
    return toResponse(product);
  }

  /**
   * Başlangıç stoğu girildiyse aynı işlemde bir "IN" hareketi de yazılır.
   * Böylece stok geçmişi ilk günden itibaren eksiksiz olur.
   * Aynı SKU → unique hatası (409); olmayan kategori/depo → foreign key hatası (400). İkisini de filtre çevirir.
   */
  async create(dto: CreateProductDto, userId: number): Promise<ProductResponseDto> {
    const stock = dto.stock ?? 0;
    const product = await this.prisma.product.create({
      data: {
        ...dto,
        stock,
        stockMovements:
          stock > 0
            ? {
                create: {
                  userId,
                  type: MovementType.IN,
                  quantity: stock,
                  previousStock: 0,
                  newStock: stock,
                  note: 'Başlangıç stoğu',
                },
              }
            : undefined,
      },
      include: withRelations,
    });
    return toResponse(product);
  }

  async update(id: number, dto: UpdateProductDto): Promise<ProductResponseDto> {
    await this.findOne(id); // yoksa anlaşılır bir 404 mesajı
    const product = await this.prisma.product.update({
      where: { id },
      data: dto,
      include: withRelations,
    });
    return toResponse(product);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
  }
}

/** Prisma Decimal tipini JSON'da sayı olarak döndür: "349.9" yerine 349.9 */
function toResponse(product: ProductWithRelations): ProductResponseDto {
  return { ...product, price: product.price.toNumber() };
}