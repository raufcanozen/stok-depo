import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Paginated } from '../common/dto/paginated-response.dto.js';
import { toPaginated, toSkipTake } from '../common/utils/pagination.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';
import { WarehouseQueryDto } from './dto/warehouse-query.dto.js';
import { WarehouseResponseDto } from './dto/warehouse-response.dto.js';

/** Her sorguda ürün sayısını da getir */
const withProductCount = { _count: { select: { products: true } } } satisfies Prisma.WarehouseInclude;
type WarehouseWithCount = Prisma.WarehouseGetPayload<{ include: typeof withProductCount }>;

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: WarehouseQueryDto): Promise<Paginated<WarehouseResponseDto>> {
    const where: Prisma.WarehouseWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { location: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [warehouses, total] = await this.prisma.$transaction([
      this.prisma.warehouse.findMany({
        where,
        include: withProductCount,
        orderBy: { [query.sortBy]: query.order },
        ...toSkipTake(query),
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return toPaginated(warehouses.map(toResponse), total, query);
  }

  async findOne(id: number): Promise<WarehouseResponseDto> {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: withProductCount,
    });
    if (!warehouse) {
      throw new NotFoundException(`${id} numaralı depo bulunamadı`);
    }
    return toResponse(warehouse);
  }

  async create(dto: CreateWarehouseDto): Promise<WarehouseResponseDto> {
    // Aynı isimde depo varsa veritabanı unique hatası → filtre 409 döndürür
    const warehouse = await this.prisma.warehouse.create({ data: dto, include: withProductCount });
    return toResponse(warehouse);
  }

  async update(id: number, dto: UpdateWarehouseDto): Promise<WarehouseResponseDto> {
    await this.findOne(id); // yoksa anlaşılır bir 404 mesajı
    const warehouse = await this.prisma.warehouse.update({
      where: { id },
      data: dto,
      include: withProductCount,
    });
    return toResponse(warehouse);
  }

  async remove(id: number): Promise<void> {
    const warehouse = await this.findOne(id);
    // Veritabanı zaten engeller (onDelete: Restrict); burada daha açıklayıcı bir mesaj veriyoruz
    if (warehouse.productCount > 0) {
      throw new ConflictException(
        `Bu depoda ${warehouse.productCount} ürün var. Önce ürünleri başka bir depoya taşıyın.`,
      );
    }
    await this.prisma.warehouse.delete({ where: { id } });
  }
}

function toResponse({ _count, ...warehouse }: WarehouseWithCount): WarehouseResponseDto {
  return { ...warehouse, productCount: _count.products };
}
