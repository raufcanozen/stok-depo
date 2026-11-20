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
      { path: '', pathMatch: 'full', redirectTo: 'products' },
      {
        path: 'categories',
        title: 'Kategoriler | Stok ve Depo Yönetimi',
        loadComponent: () => import('./pages/categories/categories').then((m) => m.Categories),
      },
            {
        path: 'warehouses',
        title: 'Depolar | Stok ve Depo Yönetimi',
        loadComponent: () => import('./pages/warehouses/warehouses').then((m) => m.Warehouses),
      },
      {
        path: 'suppliers',
        title: 'Tedarikçiler | Stok ve Depo Yönetimi',
        loadComponent: () => import('./pages/suppliers/suppliers').then((m) => m.Suppliers),
      },
      {
        path: 'products',
        title: 'Ürünler | Stok ve Depo Yönetimi',
        loadComponent: () => import('./pages/products/products').then((m) => m.Products),
      },
            {
        path: 'products/:id',
        title: 'Ürün detayı | Stok ve Depo Yönetimi',
        loadComponent: () =>
          import('./pages/product-detail/product-detail').then((m) => m.ProductDetail),
      },
    ],
  },
  // Bilinmeyen adresler ana sayfaya yönlenir
  { path: '**', redirectTo: '' },
];