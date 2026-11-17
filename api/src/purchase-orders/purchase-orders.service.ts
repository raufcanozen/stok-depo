import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Paginated } from '../common/dto/paginated-response.dto.js';
import { toPaginated, toSkipTake } from '../common/utils/pagination.js';
import { Prisma } from '../generated/prisma/client.js';
import { MovementType, PurchaseOrderStatus, Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { PurchaseOrderQueryDto } from './dto/purchase-order-query.dto.js';
import {
  PurchaseOrderDetailResponseDto,
  PurchaseOrderResponseDto,
} from './dto/purchase-order-response.dto.js';
import { UpdatePurchaseOrderStatusDto } from './dto/update-purchase-order-status.dto.js';

/** Hangi durumdan hangi durumlara geçilebilir. RECEIVED ve CANCELLED son durumlardır. */
const ALLOWED_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  PENDING: [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.CANCELLED],
  APPROVED: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED],
  RECEIVED: [],
  CANCELLED: [],
};

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

  async updateStatus(
    id: number,
    dto: UpdatePurchaseOrderStatusDto,
    user: { id: number; role: Role },
  ): Promise<PurchaseOrderDetailResponseDto> {
    // Personel yalnızca malı teslim alabilir; onay ve iptal yöneticilerin işi
    if (user.role === Role.STAFF && dto.status !== PurchaseOrderStatus.RECEIVED) {
      throw new ForbiddenException('Depo personeli yalnızca teslim alma (RECEIVED) yapabilir');
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id },
        select: { status: true, orderNumber: true, items: true },
      });
      if (!order) {
        throw new NotFoundException(`${id} numaralı sipariş bulunamadı`);
      }

      const allowed = ALLOWED_TRANSITIONS[order.status];
      if (!allowed.includes(dto.status)) {
        throw new ConflictException(
          allowed.length
            ? `${order.status} durumundaki sipariş ${dto.status} yapılamaz. İzin verilen: ${allowed.join(', ')}`
            : `${order.status} durumundaki siparişin durumu artık değiştirilemez`,
        );
      }

      // Durum "hâlâ okuduğumuz değer" ise güncellenir. Aynı anda iki kişi teslim alırsa
      // ikincisinde koşul tutmaz (count = 0) ve stok iki kez artmaz.
      const { count } = await tx.purchaseOrder.updateMany({
        where: { id, status: order.status },
        data: {
          status: dto.status,
          receivedAt: dto.status === PurchaseOrderStatus.RECEIVED ? new Date() : undefined,
        },
      });
      if (count === 0) {
        throw new ConflictException('Siparişin durumu bu sırada değişti. Sayfayı yenileyip tekrar deneyin.');
      }

      if (dto.status === PurchaseOrderStatus.RECEIVED) {
        for (const item of order.items) {
          // Artırma stoğu eksiye düşüremez; koşulsuz increment yeterli.
          // update, güncellenen satırı döndürür: newStock bizim artırmamızın sonucudur.
          const { stock: newStock } = await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
            select: { stock: true },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              userId: user.id,
              purchaseOrderId: id,
              type: MovementType.IN,
              quantity: item.quantity,
              previousStock: newStock - item.quantity,
              newStock,
              note: `${order.orderNumber} siparişi teslim alındı`,
            },
          });
        }
      }

      const updated = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id },
        include: detailInclude,
      });
      return toDetailResponse(updated);
    });
  }

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
