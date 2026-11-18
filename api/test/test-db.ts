import { ConfigService } from '@nestjs/config';
import { Role } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/** Test veritabanına bağlanan PrismaService. Yanlışlıkla asıl veritabanını silmemek için adı kontrol edilir. */
export function createTestPrisma(): PrismaService {
  if (!process.env.DATABASE_URL?.includes('_test')) {
    throw new Error('Testler yalnızca adı _test ile biten bir veritabanında çalışır');
  }
  return new PrismaService(new ConfigService());
}

/** Tüm tabloları boşaltır ve id sayaçlarını 1'e döndürür. Her testten önce çağrılır. */
export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.$executeRaw`
    TRUNCATE users, refresh_tokens, categories, warehouses, suppliers, products,
             stock_movements, purchase_orders, purchase_order_items
    RESTART IDENTITY CASCADE`;
}

/** Testlerin ortak başlangıç verisi: 2 kullanıcı, 1 kategori, 1 depo, 1 tedarikçi, 2 ürün */
export async function seedBasics(prisma: PrismaService) {
  const manager = await prisma.user.create({
    data: { name: 'Test Müdür', email: 'mudur@test.com', passwordHash: '-', role: Role.WAREHOUSE_MANAGER },
  });
  const staff = await prisma.user.create({
    data: { name: 'Test Personel', email: 'personel@test.com', passwordHash: '-', role: Role.STAFF },
  });
  const category = await prisma.category.create({ data: { name: 'Test Kategori' } });
  const warehouse = await prisma.warehouse.create({ data: { name: 'Test Depo' } });
  const supplier = await prisma.supplier.create({
    data: { name: 'Test Tedarikçi', email: 't@test.com', phone: '0', taxNumber: '1234567890' },
  });
  const common = { categoryId: category.id, warehouseId: warehouse.id, price: 100 };
  const mouse = await prisma.product.create({
    data: { ...common, name: 'Mouse', sku: 'T-MOUSE', stock: 10, criticalStock: 2 },
  });
  const keyboard = await prisma.product.create({
    data: { ...common, name: 'Klavye', sku: 'T-KEYB', stock: 0, criticalStock: 5 },
  });
  return { manager, staff, supplier, mouse, keyboard };
}

/** Bir ürünün o anki stoğu */
export async function stockOf(prisma: PrismaService, productId: number): Promise<number> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  return product.stock;
}