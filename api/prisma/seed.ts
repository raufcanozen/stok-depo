
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});


const TEST_PASSWORD = 'Sifre123!';

async function seedUsers() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const users = [
    { name: 'Admin Kullanıcı', email: 'admin@stokdepo.com', role: Role.ADMIN },
    { name: 'Depo Müdürü', email: 'mudur@stokdepo.com', role: Role.WAREHOUSE_MANAGER },
    { name: 'Depo Personeli', email: 'personel@stokdepo.com', role: Role.STAFF },
    { name: 'İzleyici', email: 'izleyici@stokdepo.com', role: Role.VIEWER },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
  }
  console.log(`✔ ${users.length} kullanıcı`);
}

async function seedCatalog() {
  const categoryNames = ['Elektronik', 'Ofis Malzemeleri', 'Temizlik'];
  const categories: Record<string, number> = {};
  for (const name of categoryNames) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    categories[name] = c.id;
  }
  console.log(`✔ ${categoryNames.length} kategori`);

  const warehouseData = [
    { name: 'İstanbul Ana Depo', location: 'Tuzla, İstanbul', capacity: 10000 },
    { name: 'Ankara Depo', location: 'Sincan, Ankara', capacity: 5000 },
  ];
  const warehouses: Record<string, number> = {};
  for (const w of warehouseData) {
    const created = await prisma.warehouse.upsert({ where: { name: w.name }, update: {}, create: w });
    warehouses[w.name] = created.id;
  }
  console.log(`✔ ${warehouseData.length} depo`);

  const suppliers = [
    { name: 'Teknoloji Dağıtım A.Ş.', email: 'satis@teknodagitim.com', phone: '0212 555 10 10', taxNumber: '1234567890' },
    { name: 'Ofis Tedarik Ltd.', email: 'info@ofistedarik.com', phone: '0312 555 20 20', taxNumber: '9876543210' },
  ];
  for (const s of suppliers) {
    await prisma.supplier.upsert({ where: { taxNumber: s.taxNumber }, update: {}, create: s });
  }
  console.log(`✔ ${suppliers.length} tedarikçi`);

  const products = [
    { name: 'Kablosuz Mouse', sku: 'MOUSE-001', category: 'Elektronik', warehouse: 'İstanbul Ana Depo', stock: 150, criticalStock: 20, price: 349.9 },
    { name: 'Mekanik Klavye', sku: 'KEYB-001', category: 'Elektronik', warehouse: 'İstanbul Ana Depo', stock: 15, criticalStock: 20, price: 1299.0 },
    { name: '27" Monitör', sku: 'MON-027', category: 'Elektronik', warehouse: 'Ankara Depo', stock: 40, criticalStock: 10, price: 7499.0 },
    { name: 'A4 Fotokopi Kağıdı (500 yp)', sku: 'PAPER-A4', category: 'Ofis Malzemeleri', warehouse: 'Ankara Depo', stock: 500, criticalStock: 100, price: 189.5 },
    { name: 'Tükenmez Kalem (Mavi)', sku: 'PEN-BLUE', category: 'Ofis Malzemeleri', warehouse: 'İstanbul Ana Depo', stock: 8, criticalStock: 50, price: 12.75 },
    { name: 'Yüzey Temizleyici 1L', sku: 'CLEAN-001', category: 'Temizlik', warehouse: 'Ankara Depo', stock: 0, criticalStock: 30, price: 89.9 },
  ];
  for (const p of products) {
    const { category, warehouse, ...data } = p;
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: { ...data, categoryId: categories[category], warehouseId: warehouses[warehouse] },
    });
  }
  console.log(`✔ ${products.length} ürün (bazıları kritik stok seviyesinde)`);
}

async function main() {
  console.log('🌱 Seed başlıyor...');
  await seedUsers();
  await seedCatalog();
  console.log(`🌱 Seed tamamlandı. Test kullanıcılarının şifresi: ${TEST_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());