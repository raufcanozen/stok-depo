import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Token gerektirmeyen auth adresleri (backend'de @Public) */
const PUBLIC_AUTH_URLS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh-token',
  '/api/auth/logout',
];

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

/**
 * Her isteğe access token'ı ekler. Yanıt 401 ise (token süresi dolmuş)
 * bir kez yeni token alır ve isteği tekrarlar.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (PUBLIC_AUTH_URLS.includes(req.url)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const token = auth.accessToken;

  return next(withToken(req, token)).pipe(
    catchError((err: unknown) => {
      // Yalnızca "giriş yapmıştık ama token reddedildi" durumunda yenile
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || !token) {
        return throwError(() => err);
      }

      return auth.refresh().pipe(
        catchError((refreshErr: unknown) => {
          auth.sessionExpired();
          return throwError(() => refreshErr);
        }),
        // Yeni token ile isteği BİR kez tekrarla (tekrar 401 gelirse döngüye girmez)
        switchMap((newToken) => next(withToken(req, newToken))),
      );
    }),
  );
};