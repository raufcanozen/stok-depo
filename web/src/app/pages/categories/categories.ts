import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http/api-error';
import { ListQuery } from '../../core/http/paginated';
import { PageHeader } from '../../shared/page-header/page-header';
import { CategoriesService } from './categories.service';
import { Category } from './category.models';

@Component({
  selector: 'app-categories',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    NzButtonModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzPopconfirmModule,
    NzTableModule,
    PageHeader,
  ],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories {
  private readonly service = inject(CategoriesService);
  private readonly message = inject(NzMessageService);
  protected readonly auth = inject(AuthService);

  // Yetkiler backend'deki @Roles ile aynı. Buton gizlemek yalnızca kolaylık; asıl kontrol backend'de.
  protected readonly canEdit = this.auth.hasRole('ADMIN', 'WAREHOUSE_MANAGER');
  protected readonly canDelete = this.auth.hasRole('ADMIN');

  // ---- Liste ----
  protected readonly query = signal<ListQuery>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    order: 'desc',
  });
  protected readonly rows = signal<Category[]>([]);
  protected readonly total = signal<number | null>(null);
  protected readonly loading = signal(false);
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.service.list(this.query()).subscribe({
      next: (res) => {
        this.rows.set(res.data);
        this.total.set(res.meta.total);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.message.error(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  /** Sorgu değişince listeyi yeniden yükler */
  private setQuery(change: Partial<ListQuery>): void {
    this.query.update((q) => ({ ...q, ...change }));
    this.load();
  }

  protected onPageChange(page: number): void {
    this.setQuery({ page });
  }

  protected onPageSizeChange(limit: number): void {
    this.setQuery({ limit, page: 1 });
  }

  protected onSort(sortBy: string, order: NzTableSortOrder): void {
    // Sıralama kaldırılırsa varsayılana (en yeni üstte) dön
    this.setQuery(
      order
        ? { sortBy, order: order === 'ascend' ? 'asc' : 'desc' }
        : { sortBy: 'createdAt', order: 'desc' },
    );
  }

  /** Her tuşta istek atmamak için yazma bittikten 300 ms sonra arar */
  protected onSearch(value: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.setQuery({ search: value.trim(), page: 1 }), 300);
  }

  // ---- Ekleme / düzenleme penceresi ----
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Category | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(500)],
  });

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset();
    this.modalOpen.set(true);
  }

  protected openEdit(category: Category): void {
    this.editing.set(category);
    this.form.reset({ name: category.name, description: category.description ?? '' });
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected save(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }

    const { name, description } = this.form.getRawValue();
    const editing = this.editing();
    // Açıklama boşsa: eklemede hiç gönderme, düzenlemede null gönder (mevcut açıklama silinsin)
    const input = {
      name: name.trim(),
      description: description.trim() || (editing ? null : undefined),
    };

    this.saving.set(true);
    const request = editing ? this.service.update(editing.id, input) : this.service.create(input);

    request.subscribe({
      next: () => {
        this.message.success(editing ? 'Kategori güncellendi' : 'Kategori eklendi');
        this.saving.set(false);
        this.modalOpen.set(false);
        // Yeni kayıt en üstte görünsün diye eklemeden sonra ilk sayfaya dön
        if (editing) this.load();
        else this.setQuery({ page: 1 });
      },
      error: (err: unknown) => {
        // Pencere açık kalır, kullanıcı düzeltip tekrar deneyebilir (ör. aynı ad)
        this.message.error(errorMessage(err));
        this.saving.set(false);
      },
    });
  }

  // ---- Silme ----
  protected remove(category: Category): void {
    this.service.remove(category.id).subscribe({
      next: () => {
        this.message.success(`"${category.name}" silindi`);
        // Sayfadaki son kayıt silindiyse bir önceki sayfaya geç
        const { page } = this.query();
        if (this.rows().length === 1 && page > 1) this.setQuery({ page: page - 1 });
        else this.load();
      },
      error: (err: unknown) => this.message.error(errorMessage(err)),
    });
  }
}