import {ValidationPipe} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {NestFactory} from '@nestjs/core';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {AppModule} from './app.module.js';
import {AllExceptionsFilter} from './common/filters/all-exceptions.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Gelen istek gövdelerini DTO kurallarına göre doğrula
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da olmayan alanları at
      forbidNonWhitelisted: true, // ...ya da hata ver
      transform: true, // "5" gibi string'leri DTO'daki tipe (number) çevir
    }),
  );

  // Tüm hataları tek formatta döndür
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger dokümantasyonu: http://localhost:3000/api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Stok ve Depo Yönetim API')
    .setDescription('Ürün, depo, stok hareketi, tedarikçi ve satın alma siparişi yönetimi')
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