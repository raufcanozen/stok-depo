import { ConflictException, ForbiddenException } from '@nestjs/common';
import { createTestPrisma, resetDb, seedBasics, stockOf } from '../../test/test-db.js';
import { MovementType, PurchaseOrderStatus, Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';

const { APPROVED, RECEIVED, CANCELLED } = PurchaseOrderStatus;

describe('PurchaseOrdersService (gerçek veritabanı)', () => {
  let prisma: PrismaService;
  let service: PurchaseOrdersService;
  let data: Awaited<ReturnType<typeof seedBasics>>;
  let manager: { id: number; role: Role };
  let staff: { id: number; role: Role };

  beforeAll(() => {
    prisma = createTestPrisma();
    service = new PurchaseOrdersService(prisma);
  });

  beforeEach(async () => {
    await resetDb(prisma);
    data = await seedBasics(prisma); // mouse: stok 10, klavye: stok 0
    manager = { id: data.manager.id, role: Role.WAREHOUSE_MANAGER };
    staff = { id: data.staff.id, role: Role.STAFF };
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /** Mouse'tan 5, klavyeden 20 adetlik bir sipariş oluşturur */
  function createOrder() {
    return service.create(
      {
        supplierId: data.supplier.id,
        items: [
          { productId: data.mouse.id, quantity: 5, unitPrice: 0.1 },
          { productId: data.keyboard.id, quantity: 20, unitPrice: 0.2 },
        ],
      },
      data.manager.id,
    );
  }

  describe('oluşturma', () => {
    it('PENDING başlar, numara üretir ve toplamı kuruş hatası olmadan hesaplar', async () => {
      const order = await createOrder();

      expect(order.status).toBe(PurchaseOrderStatus.PENDING);
      expect(order.orderNumber).toMatch(/^PO-\d{4}-\d{5}$/);
      // 5 × 0.1 + 20 × 0.2 = 4.5 (sıradan sayılarla 4.500000000000001 çıkabilirdi)
      expect(order.totalAmount).toBe(4.5);
      expect(order.items).toHaveLength(2);
    });
  });

  describe('durum geçişleri', () => {
    it('PENDING sipariş onaylanmadan teslim alınamaz', async () => {
      const order = await createOrder();

      await expect(service.updateStatus(order.id, { status: RECEIVED }, manager)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('personel siparişi onaylayamaz', async () => {
      const order = await createOrder();

      await expect(service.updateStatus(order.id, { status: APPROVED }, staff)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('teslim alınmış sipariş iptal edilemez', async () => {
      const order = await createOrder();
      await service.updateStatus(order.id, { status: APPROVED }, manager);
      await service.updateStatus(order.id, { status: RECEIVED }, staff);

      await expect(service.updateStatus(order.id, { status: CANCELLED }, manager)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('iptal edilen siparişte stok değişmez', async () => {
      const order = await createOrder();
      await service.updateStatus(order.id, { status: CANCELLED }, manager);

      expect(await stockOf(prisma, data.mouse.id)).toBe(10);
      expect(await prisma.stockMovement.count()).toBe(0);
    });
  });

  describe('teslim alma', () => {
    it('her kalem için stoğu artırır ve siparişe bağlı IN hareketi yazar', async () => {
      const order = await createOrder();
      await service.updateStatus(order.id, { status: APPROVED }, manager);

      const received = await service.updateStatus(order.id, { status: RECEIVED }, staff);

      expect(received.status).toBe(RECEIVED);
      expect(received.receivedAt).not.toBeNull();
      expect(await stockOf(prisma, data.mouse.id)).toBe(15); // 10 + 5
      expect(await stockOf(prisma, data.keyboard.id)).toBe(20); // 0 + 20

      const movements = await prisma.stockMovement.findMany({ orderBy: { id: 'asc' } });
      expect(movements).toHaveLength(2);
      for (const m of movements) {
        expect(m).toMatchObject({ type: MovementType.IN, purchaseOrderId: order.id, userId: staff.id });
      }
    });

    it('aynı anda gelen teslim almalarda stok yalnızca bir kez artar', async () => {
      const order = await createOrder();
      await service.updateStatus(order.id, { status: APPROVED }, manager);

      const results = await Promise.allSettled(
        Array.from({ length: 3 }, () => service.updateStatus(order.id, { status: RECEIVED }, staff)),
      );

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(2);
      expect(await stockOf(prisma, data.mouse.id)).toBe(15);
      expect(await prisma.stockMovement.count()).toBe(2);
    });

    it('bir kalemde hata çıkarsa hiçbir şey kaydedilmez (transaction geri alınır)', async () => {
      const order = await createOrder();
      await service.updateStatus(order.id, { status: APPROVED }, manager);
      // Klavye stoğunu PostgreSQL INTEGER sınırına yaklaştır: +20 taşma hatası verecek
      await prisma.product.update({ where: { id: data.keyboard.id }, data: { stock: 2_147_483_640 } });

      await expect(service.updateStatus(order.id, { status: RECEIVED }, staff)).rejects.toThrow();

      // İlk kalem (mouse) işlenmişti ama geri alındı; sipariş de hâlâ APPROVED
      expect(await stockOf(prisma, data.mouse.id)).toBe(10);
      expect(await prisma.stockMovement.count()).toBe(0);
      const after = await service.findOne(order.id);
      expect(after.status).toBe(APPROVED);
    });
  });
});