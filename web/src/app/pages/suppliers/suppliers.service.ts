import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ListQuery, Paginated, toParams } from '../../core/http/paginated';
import { Supplier, SupplierInput } from './supplier.models';

const URL = '/api/suppliers';

/** Tedarikçi endpoint'leri */
@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private readonly http = inject(HttpClient);

  list(query: ListQuery): Observable<Paginated<Supplier>> {
    return this.http.get<Paginated<Supplier>>(URL, { params: toParams(query) });
  }

  create(input: SupplierInput): Observable<Supplier> {
    return this.http.post<Supplier>(URL, input);
  }

  update(id: number, input: SupplierInput): Observable<Supplier> {
    return this.http.put<Supplier>(`${URL}/${id}`, input);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${URL}/${id}`);
  }
}