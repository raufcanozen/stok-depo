import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

/**
 * Uygulamanın genel ayarları. main.ts ve e2e testleri AYNI ayarları kullansın diye tek yerde.
 * (Testte farklı ayar olursa test, gerçek uygulamayı değil başka bir şeyi test etmiş olur.)
 */
export function setupApp(app: INestApplication): void {
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
}