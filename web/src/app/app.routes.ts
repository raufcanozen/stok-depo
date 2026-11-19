import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Giriş | Stok ve Depo Yönetimi',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    // Giriş gerektiren tüm sayfalar layout'un içinde açılır
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'categories' },
      {
        path: 'categories',
        title: 'Kategoriler | Stok ve Depo Yönetimi',
        loadComponent: () => import('./pages/categories/categories').then((m) => m.Categories),
      },
    ],
  },
  // Bilinmeyen adresler ana sayfaya yönlenir
  { path: '**', redirectTo: '' },
];