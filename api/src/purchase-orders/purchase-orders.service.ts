import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Paginated } from '../common/dto/paginated-response.dto.js';
import { toPaginated, toSkipTake } from '../common/utils/pagination.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { PurchaseOrderQueryDto } from './dto/purchase-order-query.dto.js';
import {
  PurchaseOrderDetailResponseDto,
  PurchaseOrderResponseDto,
} from './dto/purchase-order-response.dto.js';

/** Veritabanındaki Decimal(12,2) sütununa sığacak en büyük tutar */
const MAX_TOTAL = new Prisma.Decimal('9999999999.99');

const listInclude = {
  supplier: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  _count: { select: { items: true } },
} satisfies Prisma.PurchaseOrderInclude;

const detailInclude = {
  ...listInclude,
  items: {
    include: { product: { select: { id: true, name: true, sku: true } } },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.PurchaseOrderInclude;

type OrderWithList = Prisma.PurchaseOrderGetPayload<{ include: typeof listInclude }>;
type OrderWithDetail = Prisma.PurchaseOrderGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PurchaseOrderQueryDto): Promise<Paginated<PurchaseOrderResponseDto>> {
    const where: Prisma.PurchaseOrderWhereInput = {
      status: query.status,
      supplierId: query.supplierId,
      // Sipariş numarasında veya tedarikçi adında arama
      OR: query.search
        ? [
            { orderNumber: { contains: query.search, mode: 'insensitive' } },
            { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
          ]
        : undefined,
    };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        include: listInclude,
        orderBy: { [query.sortBy]: query.order },
        ...toSkipTake(query),
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return toPaginated(orders.map(toListResponse), total, query);
  }

  async findOne(id: number): Promise<PurchaseOrderDetailResponseDto> {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!order) {
      throw new NotFoundException(`${id} numaralı sipariş bulunamadı`);
    }
    return toDetailResponse(order);
  }

  async create(dto: CreatePurchaseOrderDto, userId: number): Promise<PurchaseOrderDetailResponseDto> {
    // Toplamı sunucu hesaplar (istemciye güvenilmez). Decimal: 0.1 + 0.2 = 0.3 tam çıkar.
    const totalAmount = dto.items.reduce(
      (sum, item) => sum.plus(new Prisma.Decimal(item.unitPrice).times(item.quantity)),
      new Prisma.Decimal(0),
    );
    if (totalAmount.greaterThan(MAX_TOTAL)) {
      throw new BadRequestException('Sipariş toplamı çok büyük; siparişi bölün');
    }

    const id = await this.nextOrderId();
    const order = await this.prisma.purchaseOrder.create({
      data: {
        id,
        orderNumber: `PO-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`,
        supplierId: dto.supplierId,
        createdById: userId,
        totalAmount,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        note: dto.note,
        items: { create: dto.items },
      },
      include: detailInclude,
    });
    return toDetailResponse(order);
  }

  /**
   * Sipariş numarasını id'den üretmek için sıradaki id'yi veritabanından önceden alırız.
   * Sequence her çağrıda farklı sayı verir; aynı anda gelen iki istek aynı numarayı alamaz.
   */
  private async nextOrderId(): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ id: bigint }[]>`
      SELECT nextval(pg_get_serial_sequence('purchase_orders', 'id')) AS id`;
    return Number(row.id);
  }
}

function toListResponse({ _count, ...order }: OrderWithList): PurchaseOrderResponseDto {
  return {
    ...order,
    totalAmount: order.totalAmount.toNumber(),
    // @db.Date sütunu: saat kısmı anlamsız, yalnızca "YYYY-MM-DD" döndür
    expectedDate: order.expectedDate ? order.expectedDate.toISOString().slice(0, 10) : null,
    itemCount: _count.items,
  };
}

function toDetailResponse({ items, ...order }: OrderWithDetail): PurchaseOrderDetailResponseDto {
  return {
    ...toListResponse(order),
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toNumber(),
      lineTotal: item.unitPrice.times(item.quantity).toNumber(),
    })),
  };
}
