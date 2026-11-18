import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { Role } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { resetDb } from './test-db.js';

const { ADMIN, WAREHOUSE_MANAGER, STAFF, VIEWER } = Role;
const ALL = [ADMIN, WAREHOUSE_MANAGER, STAFF, VIEWER];
const MANAGERS = [ADMIN, WAREHOUSE_MANAGER];
const WORKERS = [ADMIN, WAREHOUSE_MANAGER, STAFF];

/**
 * Yetki tablosu: hangi endpoint'i hangi roller kullanabilir.
 * Koddan değil, proje kurallarından yazıldı; test kodun bu kurallara uyduğunu doğrular.
 *
 * Veri değiştirmemek için: POST/PUT/PATCH istekleri boş gövdeyle ({}) gider. Yetkisi olan rol
 * guard'ı geçer ve doğrulamada 400 alır; yetkisi olmayan guard'da 403 alır. DELETE ve detay
 * istekleri olmayan bir id (999999) ile gider: yetkili 404, yetkisiz 403 alır.
 */
const MATRIX: { method: 'get' | 'post' | 'put' | 'patch' | 'delete'; path: string; roles: Role[] }[] = [
  { method: 'get', path: '/api/auth/me', roles: ALL },

  { method: 'get', path: '/api/users', roles: [ADMIN] },
  { method: 'get', path: '/api/users/999999', roles: [ADMIN] },
  { method: 'post', path: '/api/users', roles: [ADMIN] },
  { method: 'patch', path: '/api/users/999999', roles: [ADMIN] },

  { method: 'get', path: '/api/categories', roles: ALL },
  { method: 'get', path: '/api/categories/999999', roles: ALL },
  { method: 'post', path: '/api/categories', roles: MANAGERS },
  { method: 'put', path: '/api/categories/999999', roles: MANAGERS },
  { method: 'delete', path: '/api/categories/999999', roles: [ADMIN] },

  { method: 'get', path: '/api/warehouses', roles: ALL },
  { method: 'get', path: '/api/warehouses/999999', roles: ALL },
  { method: 'post', path: '/api/warehouses', roles: MANAGERS },
  { method: 'put', path: '/api/warehouses/999999', roles: MANAGERS },
  { method: 'delete', path: '/api/warehouses/999999', roles: [ADMIN] },

  { method: 'get', path: '/api/suppliers', roles: ALL },
  { method: 'get', path: '/api/suppliers/999999', roles: ALL },
  { method: 'post', path: '/api/suppliers', roles: MANAGERS },
  { method: 'put', path: '/api/suppliers/999999', roles: MANAGERS },
  { method: 'delete', path: '/api/suppliers/999999', roles: [ADMIN] },

  { method: 'get', path: '/api/products', roles: ALL },
  { method: 'get', path: '/api/products/999999', roles: ALL },
  { method: 'post', path: '/api/products', roles: MANAGERS },
  { method: 'put', path: '/api/products/999999', roles: MANAGERS },
  { method: 'delete', path: '/api/products/999999', roles: [ADMIN] },

  { method: 'get', path: '/api/products/999999/stock', roles: ALL },
  { method: 'post', path: '/api/products/999999/stock/increase', roles: WORKERS },
  { method: 'post', path: '/api/products/999999/stock/decrease', roles: WORKERS },

  { method: 'get', path: '/api/stock-movements', roles: ALL },
  { method: 'get', path: '/api/stock-movements/999999', roles: ALL },
  { method: 'post', path: '/api/stock-movements', roles: WORKERS },

  { method: 'get', path: '/api/purchase-orders', roles: ALL },
  { method: 'get', path: '/api/purchase-orders/999999', roles: ALL },
  { method: 'post', path: '/api/purchase-orders', roles: MANAGERS },
  { method: 'put', path: '/api/purchase-orders/999999/status', roles: WORKERS },
];

describe('Yetki tablosu (e2e)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<Role, string>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();

    // Her rolden bir kullanıcı oluştur ve gerçek login endpoint'iyle token al
    const prisma = app.get(PrismaService);
    await resetDb(prisma);
    const passwordHash = await bcrypt.hash('Sifre123!', 4);
    for (const role of ALL) {
      const email = `${role.toLowerCase()}@test.com`;
      await prisma.user.create({ data: { name: role, email, passwordHash, role } });
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'Sifre123!' })
        .expect(200);
      tokens[role] = res.body.accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe.each(MATRIX)('$method $path', ({ method, path, roles }) => {
    it('token olmadan 401', async () => {
      const res = await request(app.getHttpServer())[method](path).send({});
      expect(res.status).toBe(401);
    });

    it.each(ALL)('%s', async (role) => {
      const res = await request(app.getHttpServer())
        [method](path)
        .set('Authorization', `Bearer ${tokens[role]}`)
        .send({});

      if (roles.includes(role)) {
        // Yetkili: guard'ı geçti (sonuç 200, 400 veya 404 olabilir ama 401/403 olamaz)
        expect([401, 403]).not.toContain(res.status);
      } else {
        expect(res.status).toBe(403);
      }
    });
  });

  it('herkese açık endpoint\'ler token istemez', async () => {
    const server = app.getHttpServer();
    await request(server).get('/api/health').expect(200);
    // Boş gövde: doğrulama hatası (400) alır ama 401 almaz
    await request(server).post('/api/auth/register').send({}).expect(400);
    await request(server).post('/api/auth/login').send({}).expect(400);
    await request(server).post('/api/auth/refresh-token').send({}).expect(400);
  });
});