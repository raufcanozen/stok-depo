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
import { Supplier } from './supplier.models';
import { SuppliersService } from './suppliers.service';

@Component({
  selector: 'app-suppliers',
  imports: [
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
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.css',
})
export class Suppliers {
  private readonly service = inject(SuppliersService);
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
  protected readonly rows = signal<Supplier[]>([]);
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
  protected readonly editing = signal<Supplier | null>(null);
  protected readonly saving = signal(false);

  // Kurallar backend'deki CreateSupplierDto ile aynı
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    taxNumber: ['', [Validators.required, Validators.pattern(/^\d{10,11}$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    phone: ['', [Validators.required, Validators.maxLength(30)]],
    address: ['', Validators.maxLength(500)],
  });

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset();
    this.modalOpen.set(true);
  }

  protected openEdit(supplier: Supplier): void {
    this.editing.set(supplier);
    this.form.reset({
      name: supplier.name,
      taxNumber: supplier.taxNumber,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address ?? '',
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

    const { name, taxNumber, email, phone, address } = this.form.getRawValue();
    const editing = this.editing();
    const input = {
      name: name.trim(),
      taxNumber: taxNumber.trim(),
      email: email.trim(),
      phone: phone.trim(),
      // Adres boşsa: eklemede hiç gönderme, düzenlemede null gönder (mevcut adres silinsin)
      address: address.trim() || (editing ? null : undefined),
    };

    this.saving.set(true);
    const request = editing ? this.service.update(editing.id, input) : this.service.create(input);

    request.subscribe({
      next: () => {
        this.message.success(editing ? 'Tedarikçi güncellendi' : 'Tedarikçi eklendi');
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
  protected remove(supplier: Supplier): void {
    this.service.remove(supplier.id).subscribe({
      next: () => {
        this.message.success(`"${supplier.name}" silindi`);
        const { page } = this.query();
        if (this.rows().length === 1 && page > 1) this.setQuery({ page: page - 1 });
        else this.load();
      },
      error: (err: unknown) => this.message.error(errorMessage(err)),
    });
  }
}