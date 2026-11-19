import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import tr from '@angular/common/locales/tr';
import { tr_TR, provideNzI18n } from 'ng-zorro-antd/i18n';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzConfig } from 'ng-zorro-antd/core/config';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
  LockOutline,
  LogoutOutline,
  PlusOutline,
  SearchOutline,
  TagsOutline,
  UserOutline,
} from '@ant-design/icons-angular/icons';
import { authInterceptor } from './core/auth/auth.interceptor';
import { routes } from './app.routes';

// Tarih, sayı ve para biçimleri Türkçe olsun (ör. 1.234,50)
registerLocaleData(tr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // DatePipe, CurrencyPipe gibi pipe'lar Türkçe biçim kullansın
    { provide: LOCALE_ID, useValue: 'tr' },
    // Backend'e istek atmak için HttpClient. authInterceptor her isteğe token ekler.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    // NG-ZORRO bileşenlerinin metinleri Türkçe (tarih seçici, sayfalama vb.)
    provideNzI18n(tr_TR),
    provideNzDateFnsAdapter(),
    // Kullanılan ikonlar burada kaydedilir (yalnızca bunlar pakete eklenir)
    provideNzIcons([
      UserOutline,
      LockOutline,
      LogoutOutline,
      TagsOutline,
      PlusOutline,
      SearchOutline,
    ]),
    // Ana renk (styles.css'teki --accent ile aynı). angular.json'da variable.min.css gerekir.
    provideNzConfig({ theme: { primaryColor: '#002FA7' } }),
  ],
};