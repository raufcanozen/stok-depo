import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Giriş yapmamış kullanıcıyı giriş sayfasına gönderir, döneceği adresi saklar */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isLoggedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Giriş yapmış kullanıcı giriş sayfasını açarsa ana sayfaya gönderir */
export const guestGuard: CanActivateFn = () => {
  if (inject(AuthService).isLoggedIn()) {
    return inject(Router).createUrlTree(['/']);
  }
  return true;
};