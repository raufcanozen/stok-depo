import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http/api-error';
import { ListQuery } from '../../core/http/paginated';
import { PageHeader } from '../../shared/page-header/page-header';
import { Warehouse } from './warehouse.models';
import { WarehousesService } from './warehouses.service';

@Component({
  selector: 'app-warehouses',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    NzButtonModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzModalModule,
    NzPopconfirmModule,
    NzTableModule,
    PageHeader,
  ],
  templateUrl: './warehouses.html',
  styleUrl: './warehouses.css',
})
export class Warehouses {
  private readonly service = inject(WarehousesService);
  private readonly message = inject(NzMessageService);
  protected readonly auth = inject(AuthService);

  // Yetkiler backend'deki @Roles ile aynı
  protected readonly canEdit = this.auth.hasRole('ADMIN', 'WAREHOUSE_MANAGER');
  protected readonly canDelete = this.auth.hasRole('ADMIN');

  // ---- Liste ----
  protected readonly query = signal<ListQuery>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    order: 'desc',
  });
  protected readonly rows = signal<Warehouse[]>([]);
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
    this.setQuery(
      order
        ? { sortBy, order: order === 'ascend' ? 'asc' : 'desc' }
        : { sortBy: 'createdAt', order: 'desc' },
    );
  }

  protected onSearch(value: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.setQuery({ search: value.trim(), page: 1 }), 300);
  }

  // ---- Ekleme / düzenleme penceresi ----
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Warehouse | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    location: ['', Validators.maxLength(255)],
    // Boş bırakılabilir: nz-input-number boşken null verir
    capacity: new FormControl<number | null>(null, Validators.min(1)),
  });

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset();
    this.modalOpen.set(true);
  }

  protected openEdit(warehouse: Warehouse): void {
    this.editing.set(warehouse);
    this.form.reset({
      name: warehouse.name,
      location: warehouse.location ?? '',
      capacity: warehouse.capacity,
    });
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

    const { name, location, capacity } = this.form.getRawValue();
    const editing = this.editing();
    // Boş alan: eklemede hiç gönderme, düzenlemede null gönder (mevcut değer silinsin)
    const empty = editing ? null : undefined;
    const input = {
      name: name.trim(),
      location: location.trim() || empty,
      capacity: capacity ?? empty,
    };

    this.saving.set(true);
    const request = editing ? this.service.update(editing.id, input) : this.service.create(input);

    request.subscribe({
      next: () => {
        this.message.success(editing ? 'Depo güncellendi' : 'Depo eklendi');
        this.saving.set(false);
        this.modalOpen.set(false);
        if (editing) this.load();
        else this.setQuery({ page: 1 });
      },
      error: (err: unknown) => {
        this.message.error(errorMessage(err));
        this.saving.set(false);
      },
    });
  }

  // ---- Silme ----
  protected remove(warehouse: Warehouse): void {
    this.service.remove(warehouse.id).subscribe({
      next: () => {
        this.message.success(`"${warehouse.name}" silindi`);
        const { page } = this.query();
        if (this.rows().length === 1 && page > 1) this.setQuery({ page: page - 1 });
        else this.load();
      },
      error: (err: unknown) => this.message.error(errorMessage(err)),
    });
  }
}