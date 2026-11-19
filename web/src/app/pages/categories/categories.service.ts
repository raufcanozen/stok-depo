import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ListQuery, Paginated, toParams } from '../../core/http/paginated';
import { Category, CategoryInput } from './category.models';

const URL = '/api/categories';

/** Kategori endpoint'leri */
@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);

  list(query: ListQuery): Observable<Paginated<Category>> {
    return this.http.get<Paginated<Category>>(URL, { params: toParams(query) });
  }

  create(input: CategoryInput): Observable<Category> {
    return this.http.post<Category>(URL, input);
  }

  update(id: number, input: CategoryInput): Observable<Category> {
    return this.http.put<Category>(`${URL}/${id}`, input);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${URL}/${id}`);
  }
}