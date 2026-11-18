import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Paginated } from '../common/dto/paginated-response.dto.js';
import { toPaginated, toSkipTake } from '../common/utils/pagination.js';
import { Prisma } from '../generated/prisma/client.js';
import { MovementType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto.js';
import { ProductStockResponseDto } from './dto/product-stock-response.dto.js';
import { StockChangeDto } from './dto/stock-change.dto.js';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto.js';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto.js';

/** Her hareketle birlikte ürün, kullanıcı ve (varsa) sipariş bilgisini getir */
const withRelations = {
  product: { select: { id: true, name: true, sku: true } },
  user: { select: { id: true, name: true } },
  purchaseOrder: { select: { id: true, orderNumber: true } },
} satisfies Prisma.StockMovementInclude;

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}


  async findAll(query: StockMovementQueryDto): Promise<Paginated<StockMovementResponseDto>> {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('startDate, endDate değerinden sonra olamaz');
    }

    const where: Prisma.StockMovementWhereInput = {
      productId: query.productId,
      type: query.type,
      createdAt: { gte: startDate, lte: endDate },
      // İlişkili tabloda arama: ürün adı veya SKU
      product: query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : undefined,
    };

    const [movements, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        include: withRelations,
        orderBy: { [query.sortBy]: query.order },
        ...toSkipTake(query),
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return toPaginated(movements, total, query);
  }

  async findOne(id: number): Promise<StockMovementResponseDto> {
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id },
      include: withRelations,
    });
    if (!movement) {
      throw new NotFoundException(`${id} numaralı stok hareketi bulunamadı`);
    }
    return movement;
  }

  async getProductStock(productId: number): Promise<ProductStockResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        criticalStock: true,
        // En son hareketin yalnızca tarihini al
        stockMovements: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!product) {
      throw new NotFoundException(`${productId} numaralı ürün bulunamadı`);
    }

    const { id, name, sku, stock, criticalStock, stockMovements } = product;
    return {
      product: { id, name, sku },
      stock,
      criticalStock,
      isLowStock: stock <= criticalStock,
      lastMovementAt: stockMovements[0]?.createdAt ?? null,
    };
  }

  async create(dto: CreateStockMovementDto, userId: number): Promise<StockMovementResponseDto> {
    if (dto.type === MovementType.ADJUSTMENT) {
      return this.adjustStock(dto.productId, dto.quantity, dto.note, userId);
    }
    if (dto.quantity < 1) {
      throw new BadRequestException('Giriş ve çıkışta quantity en az 1 olmalı');
    }
    return this.changeStock(dto.productId, dto.type, dto, userId);
  }

  increase(productId: number, dto: StockChangeDto, userId: number): Promise<StockMovementResponseDto> {
    return this.changeStock(productId, MovementType.IN, dto, userId);
  }

  decrease(productId: number, dto: StockChangeDto, userId: number): Promise<StockMovementResponseDto> {
    return this.changeStock(productId, MovementType.OUT, dto, userId);
  }

  /**
   * Stok değişikliği ve hareket kaydı TEK transaction içinde yapılır:
   * ikisinden biri başarısız olursa ikisi de geri alınır.
   */
  private changeStock(
    productId: number,
    type: MovementType,
    dto: StockChangeDto,
    userId: number,
  ): Promise<StockMovementResponseDto> {
    const delta = type === MovementType.IN ? dto.quantity : -dto.quantity;

    return this.prisma.$transaction(async (tx) => {
      // 1) Atomik güncelleme. Azaltmada koşul "stok yeterliyse": kontrol ve güncelleme
      //    aynı SQL cümlesinde olduğu için aynı anda gelen iki istek stoğu eksiye düşüremez.
      const { count } = await tx.product.updateMany({
        where: {
          id: productId,
          stock: type === MovementType.OUT ? { gte: dto.quantity } : undefined,
        },
        data: { stock: { increment: delta } },
      });

      // 2) Hiçbir satır güncellenmediyse: ürün yok ya da stok yetersiz
      if (count === 0) {
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { stock: true },
        });
        if (!product) {
          throw new NotFoundException(`${productId} numaralı ürün bulunamadı`);
        }
        throw new ConflictException(
          `Yetersiz stok: mevcut ${product.stock}, çıkarılmak istenen ${dto.quantity}`,
        );
      }

      // 3) Güncel stoğu oku ve hareketi kaydet. Satır bu transaction tarafından kilitli
      //    olduğu için okunan değer bizim güncellememizin sonucudur.
      const { stock: newStock } = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true },
      });

      return tx.stockMovement.create({
        data: {
          productId,
          userId,
          type,
          quantity: dto.quantity,
          previousStock: newStock - delta,
          newStock,
          note: dto.note,
        },
        include: withRelations,
      });
    });
  }

  private adjustStock(
    productId: number,
    countedStock: number,
    note: string | undefined,
    userId: number,
  ): Promise<StockMovementResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { stock: true },
      });
      if (!product) {
        throw new NotFoundException(`${productId} numaralı ürün bulunamadı`);
      }
      if (product.stock === countedStock) {
        throw new BadRequestException(`Stok zaten ${countedStock}; düzeltme gerekmiyor`);
      }

      const { count } = await tx.product.updateMany({
        where: { id: productId, stock: product.stock },
        data: { stock: countedStock },
      });
      if (count === 0) {
        throw new ConflictException('Stok bu sırada değişti. Güncel stoğa bakıp tekrar deneyin.');
      }

      return tx.stockMovement.create({
        data: {
          productId,
          userId,
          type: MovementType.ADJUSTMENT,
          quantity: Math.abs(countedStock - product.stock),
          previousStock: product.stock,
          newStock: countedStock,
          note,
        },
        include: withRelations,
      });
    });
  }
}