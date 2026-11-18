import {ConfigService} from '@nestjs/config';
import {NestFactory} from '@nestjs/core';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {AppModule} from './app.module.js';
import {setupApp} from './app.setup.js';

const SWAGGER_DESCRIPTION = `
Ürün, depo, stok hareketi, tedarikçi ve satın alma siparişi yönetimi.

**Kullanım:** \`POST /api/auth/login\` ile giriş yapın, dönen \`accessToken\` değerini sağ üstteki **Authorize** butonuna yapıştırın.

**Test kullanıcıları** (seed, şifre: \`Sifre123!\`)

| E-posta | Rol |
|---|---|
| admin@stokdepo.com | ADMIN |
| mudur@stokdepo.com | WAREHOUSE_MANAGER |
| personel@stokdepo.com | STAFF |
| izleyici@stokdepo.com | VIEWER |

**Yetkiler (özet)**

| İşlem | ADMIN | WAREHOUSE_MANAGER | STAFF | VIEWER |
|---|:-:|:-:|:-:|:-:|
| Tüm listeleme ve detaylar | ✓ | ✓ | ✓ | ✓ |
| Kategori, depo, tedarikçi, ürün ekleme/güncelleme | ✓ | ✓ | | |
| Kategori, depo, tedarikçi, ürün silme | ✓ | | | |
| Stok giriş/çıkış | ✓ | ✓ | ✓ | |
| Sayım düzeltmesi (ADJUSTMENT) | ✓ | ✓ | | |
| Sipariş oluşturma, onaylama, iptal | ✓ | ✓ | | |
| Sipariş teslim alma (RECEIVED) | ✓ | ✓ | ✓ | |
| Kullanıcı yönetimi | ✓ | | | |

**Hata formatı:** Tüm hatalar \`{ statusCode, error, message, timestamp, path }\` biçimindedir.
`;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);

  // Swagger dokümantasyonu: http://localhost:3000/api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Stok ve Depo Yönetim API')
    .setDescription(SWAGGER_DESCRIPTION)
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);

  await app.listen(port);
  console.log(`API çalışıyor:  http://localhost:${port}/api`);
  console.log(`Swagger:        http://localhost:${port}/api/docs`);
}
await bootstrap();