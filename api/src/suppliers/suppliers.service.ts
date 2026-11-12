import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Paginated } from '../common/dto/paginated-response.dto.js';
import { toPaginated, toSkipTake } from '../common/utils/pagination.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { SupplierQueryDto } from './dto/supplier-query.dto.js';
import { SupplierResponseDto } from './dto/supplier-response.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';

/** Her sorguda sipariş sayısını da getir */
const withOrderCount = { _count: { select: { purchaseOrders: true } } } satisfies Prisma.SupplierInclude;
type SupplierWithCount = Prisma.SupplierGetPayload<{ include: typeof withOrderCount }>;

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: SupplierQueryDto): Promise<Paginated<SupplierResponseDto>> {
    const where: Prisma.SupplierWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { taxNumber: { contains: query.search } },
          ],
        }
      : {};

    const [suppliers, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        include: withOrderCount,
        orderBy: { [query.sortBy]: query.order },
        ...toSkipTake(query),
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return toPaginated(suppliers.map(toResponse), total, query);
  }

  async findOne(id: number): Promise<SupplierResponseDto> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: withOrderCount,
    });
    if (!supplier) {
      throw new NotFoundException(`${id} numaralı tedarikçi bulunamadı`);
    }
    return toResponse(supplier);
  }

  async create(dto: CreateSupplierDto): Promise<SupplierResponseDto> {
    // Aynı vergi numarası varsa veritabanı unique hatası → filtre 409 döndürür
    const supplier = await this.prisma.supplier.create({ data: dto, include: withOrderCount });
    return toResponse(supplier);
  }

  async update(id: number, dto: UpdateSupplierDto): Promise<SupplierResponseDto> {
    await this.findOne(id); 
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: dto,
      include: withOrderCount,
    });
    return toResponse(supplier);
  }

  async remove(id: number): Promise<void> {
    const supplier = await this.findOne(id);
    if (supplier.purchaseOrderCount > 0) {
      throw new ConflictException(
        `Bu tedarikçinin ${supplier.purchaseOrderCount} satın alma siparişi var. Sipariş geçmişi korunduğu için silinemez.`,
      );
    }
    await this.prisma.supplier.delete({ where: { id } });
  }
}

function toResponse({ _count, ...supplier }: SupplierWithCount): SupplierResponseDto {
  return { ...supplier, purchaseOrderCount: _count.purchaseOrders };
}
