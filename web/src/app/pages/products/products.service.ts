import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Paginated, toParams } from '../../core/http/paginated';
import { Product, ProductInput, ProductQuery } from './product.models';

const URL = '/api/products';

/** Ürün endpoint'leri */
@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);

  list(query: ProductQuery): Observable<Paginated<Product>> {
    return this.http.get<Paginated<Product>>(URL, { params: toParams(query) });
  }

  get(id: number): Observable<Product> {
    return this.http.get<Product>(`${URL}/${id}`);
  }
  create(input: ProductInput): Observable<Product> {
    return this.http.post<Product>(URL, input);
  }

  /** Stok burada değiştirilemez: stok yalnızca stok hareketleriyle değişir */
  update(id: number, input: Omit<ProductInput, 'stock'>): Observable<Product> {
    return this.http.put<Product>(`${URL}/${id}`, input);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${URL}/${id}`);
  }
}