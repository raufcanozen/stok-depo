import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createTestPrisma, resetDb, seedBasics, stockOf } from '../../test/test-db.js';
import { MovementType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StockMovementsService } from './stock-movements.service.js';

describe('StockMovementsService (gerçek veritabanı)', () => {
  let prisma: PrismaService;
  let service: StockMovementsService;
  let data: Awaited<ReturnType<typeof seedBasics>>;

  beforeAll(() => {
    prisma = createTestPrisma();
    service = new StockMovementsService(prisma);
  });

  beforeEach(async () => {
    await resetDb(prisma);
    data = await seedBasics(prisma); // mouse: stok 10
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('stok artırma', () => {
    it('stoğu artırır ve önceki/sonraki stokla bir IN hareketi kaydeder', async () => {
      const movement = await service.increase(data.mouse.id, { quantity: 5, note: 'Giriş' }, data.staff.id);

      expect(movement).toMatchObject({
        type: MovementType.IN,
        quantity: 5,
        previousStock: 10,
        newStock: 15,
        note: 'Giriş',
        userId: data.staff.id,
      });
      expect(await stockOf(prisma, data.mouse.id)).toBe(15);
    });

    it('olmayan ürün için 404 verir', async () => {
      await expect(service.increase(999, { quantity: 1 }, data.staff.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('stok azaltma', () => {
    it('stoğun tamamı çıkarılabilir (10 → 0)', async () => {
      const movement = await service.decrease(data.mouse.id, { quantity: 10 }, data.staff.id);

      expect(movement).toMatchObject({ type: MovementType.OUT, previousStock: 10, newStock: 0 });
      expect(await stockOf(prisma, data.mouse.id)).toBe(0);
    });

    it('mevcut stoktan fazlası istenirse reddeder; stok ve hareket geçmişi değişmez', async () => {
      await expect(service.decrease(data.mouse.id, { quantity: 11 }, data.staff.id)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(await stockOf(prisma, data.mouse.id)).toBe(10);
      expect(await prisma.stockMovement.count()).toBe(0);
    });

    it('aynı anda gelen çıkışlar stoğu eksiye düşüremez', async () => {
      // Stok 10. Aynı anda 3'er adetlik 5 çıkış: en fazla 3 tanesi sığar (9 adet).
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () => service.decrease(data.mouse.id, { quantity: 3 }, data.staff.id)),
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');
      expect(succeeded).toHaveLength(3);
      expect(failed).toHaveLength(2);
      for (const f of failed) {
        expect((f as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
      }
      expect(await stockOf(prisma, data.mouse.id)).toBe(1);

      // Hareket geçmişi kesintisiz bir zincir olmalı: her satırın öncesi, bir öncekinin sonrası
      const movements = await prisma.stockMovement.findMany({ orderBy: { id: 'asc' } });
      expect(movements.map((m) => [m.previousStock, m.newStock])).toEqual([
        [10, 7],
        [7, 4],
        [4, 1],
      ]);
    });
  });

  describe('POST /stock-movements (create)', () => {
    it('giriş/çıkışta quantity 0 kabul edilmez', async () => {
      await expect(
        service.create({ productId: data.mouse.id, type: MovementType.IN, quantity: 0 }, data.staff.id),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('sayım düzeltmesi stoğu sayılan değere eşitler ve farkı kaydeder', async () => {
      const movement = await service.create(
        { productId: data.mouse.id, type: MovementType.ADJUSTMENT, quantity: 7, note: 'Sayım' },
        data.manager.id,
      );

      expect(movement).toMatchObject({
        type: MovementType.ADJUSTMENT,
        quantity: 3,
        previousStock: 10,
        newStock: 7,
      });
      expect(await stockOf(prisma, data.mouse.id)).toBe(7);
    });

    it('sayılan değer mevcut stokla aynıysa düzeltme yapılmaz', async () => {
      await expect(
        service.create(
          { productId: data.mouse.id, type: MovementType.ADJUSTMENT, quantity: 10 },
          data.manager.id,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});