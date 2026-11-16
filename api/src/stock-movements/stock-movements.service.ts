import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StockChangeDto } from './dto/stock-change.dto.js';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto.js';

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

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
      });
    });
  }
}