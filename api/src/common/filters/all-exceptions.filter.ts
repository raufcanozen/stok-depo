import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

type ResolvedError = Pick<ErrorBody, 'statusCode' | 'error' | 'message'>;

/** Prisma 7'nin hata ayrıntılarını koyduğu yer (PostgreSQL hata kodu, kısıt adı vb.) */
interface DbErrorCause {
  originalCode?: string;
  table?: string;
  constraint?: { index?: string; fields?: string[] };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, error, message } = this.resolve(exception);

    // 500'ler beklenmeyen hatalardır: ayrıntıyı sunucu loguna yaz
    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    };

    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): ResolvedError {
    // 1) NestJS hataları: NotFoundException, BadRequestException, ValidationPipe hataları...
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return { statusCode, error: exception.name, message: res };
      }
      const { message, error } = res as { message?: string | string[]; error?: string };
      return {
        statusCode,
        error: error ?? exception.name,
        message: message ?? exception.message,
      };
    }

    // 2) Veritabanı hataları
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const resolved = this.resolvePrisma(exception);
      if (resolved) return resolved;
    }

    // 3) Beklenmeyen her şey: ayrıntıyı istemciye gösterme
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Beklenmeyen bir sunucu hatası oluştu',
    };
  }

  private resolvePrisma(e: Prisma.PrismaClientKnownRequestError): ResolvedError | null {
    const cause = (e.meta as { driverAdapterError?: { cause?: DbErrorCause } } | undefined)
      ?.driverAdapterError?.cause;

    // Kayıt bulunamadı (update/delete edilecek kayıt yok)
    if (e.code === 'P2025') {
      return { statusCode: HttpStatus.NOT_FOUND, error: 'Not Found', message: 'Kayıt bulunamadı' };
    }

    // PostgreSQL hata kodlarına göre (Prisma 7 bunları driverAdapterError içinde verir)
    switch (cause?.originalCode) {
      case '23505': // unique ihlali: ör. aynı SKU ile ikinci ürün
        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: `Bu değer zaten kullanılıyor: ${this.uniqueField(cause)}`,
        };
      case '23503': // foreign key ihlali: ör. ürünü olan kategoriyi silmek
        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'Bu kayda bağlı başka kayıtlar olduğu için işlem yapılamaz',
        };
      case '23514': // CHECK ihlali: ör. negatif stok
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Veri kurallarına aykırı bir değer gönderildi (ör. negatif stok veya fiyat)',
        };
    }
    return null;
  }

  /** "products_sku_key" → "sku" */
  private uniqueField(cause: DbErrorCause): string {
    if (cause.constraint?.fields?.length) return cause.constraint.fields.join(', ');
    const index = cause.constraint?.index;
    if (!index) return 'benzersiz alan';
    return index.replace(new RegExp(`^${cause.table ?? ''}_`), '').replace(/_key$/, '');
  }
}