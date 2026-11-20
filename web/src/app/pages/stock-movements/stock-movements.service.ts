import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Paginated, toParams } from '../../core/http/paginated';
import {
  ProductStock,
  StockChangeInput,
  StockMovement,
  StockMovementQuery,
} from './stock-movement.models';

/** Stok hareketi endpoint'leri */
@Injectable({ providedIn: 'root' })
export class StockMovementsService {
  private readonly http = inject(HttpClient);

  list(query: StockMovementQuery): Observable<Paginated<StockMovement>> {
    return this.http.get<Paginated<StockMovement>>('/api/stock-movements', {
      params: toParams(query),
    });
  }

  getProductStock(productId: number): Observable<ProductStock> {
    return this.http.get<ProductStock>(`/api/products/${productId}/stock`);
  }

  /** Stok girişi (IN hareketi) */
  increase(productId: number, input: StockChangeInput): Observable<StockMovement> {
    return this.http.post<StockMovement>(`/api/products/${productId}/stock/increase`, input);
  }

  /** Stok çıkışı (OUT hareketi). Stok yetersizse backend 409 döner. */
  decrease(productId: number, input: StockChangeInput): Observable<StockMovement> {
    return this.http.post<StockMovement>(`/api/products/${productId}/stock/decrease`, input);
  }

  /** Sayım düzeltmesi: countedStock, sayımda bulunan gerçek stok (yalnızca Admin ve Depo Müdürü) */
  adjust(productId: number, countedStock: number, note?: string): Observable<StockMovement> {
    return this.http.post<StockMovement>('/api/stock-movements', {
      productId,
      type: 'ADJUSTMENT',
      quantity: countedStock,
      note,
    });
  }
}