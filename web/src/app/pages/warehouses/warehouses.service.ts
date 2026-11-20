import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ListQuery, Paginated, toParams } from '../../core/http/paginated';
import { Warehouse, WarehouseInput } from './warehouse.models';

const URL = '/api/warehouses';

/** Depo endpoint'leri */
@Injectable({ providedIn: 'root' })
export class WarehousesService {
  private readonly http = inject(HttpClient);

  list(query: ListQuery): Observable<Paginated<Warehouse>> {
    return this.http.get<Paginated<Warehouse>>(URL, { params: toParams(query) });
  }

  create(input: WarehouseInput): Observable<Warehouse> {
    return this.http.post<Warehouse>(URL, input);
  }

  update(id: number, input: WarehouseInput): Observable<Warehouse> {
    return this.http.put<Warehouse>(`${URL}/${id}`, input);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${URL}/${id}`);
  }
}