import { HttpErrorResponse } from '@angular/common/http';

/**
 * Backend hatasını kullanıcıya gösterilecek metne çevirir.
 * Backend formatı: { statusCode, error, message, timestamp, path }
 * message, doğrulama hatalarında dizi olabilir.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // 0: tarayıcı sunucuya ulaşamadı; 502/504: proxy backend'e ulaşamadı
    if (err.status === 0 || err.status === 502 || err.status === 504) {
      return 'Sunucuya ulaşılamadı. Backend çalışıyor mu?';
    }
    const message: unknown = err.error?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return 'Beklenmeyen bir hata oluştu';
}