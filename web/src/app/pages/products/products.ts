import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule, NzSelectOptionInterface } from 'ng-zorro-antd/select';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http/api-error';
import { PageHeader } from '../../shared/page-header/page-header';
import { CategoriesService } from '../categories/categories.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { Product, ProductQuery } from './product.models';
import { ProductsService } from './products.service';

/** Backend'deki SKU kuralı: büyük harf/rakam blokları, aralarında tek tire (ör. MOUSE-001) */
const SKU_PATTERN = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

@Component({
  selector: 'app-products',
  imports: [
    CurrencyPipe,
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzCheckboxModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzModalModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzTableModule,
    PageHeader,
  ],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products {
  private readonly service = inject(ProductsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly message = inject(NzMessageService);
  protected readonly auth = inject(AuthService);

  // Yetkiler backend'deki @Roles ile aynı
  protected readonly canEdit = this.auth.hasRole('ADMIN', 'WAREHOUSE_MANAGER');
  protected readonly canDelete = this.auth.hasRole('ADMIN');

  /** Filtre ve formdaki açılır listelerin seçenekleri */
  protected readonly categoryOptions = signal<NzSelectOptionInterface[]>([]);
  protected readonly warehouseOptions = signal<NzSelectOptionInterface[]>([]);

  // ---- Liste ----
  protected readonly query = signal<ProductQuery>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    order: 'desc',
  });
  protected readonly rows = signal<Product[]>([]);
  protected readonly total = signal<number | null>(null);
  protected readonly loading = signal(false);
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.load();
    this.loadOptions();
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

  /** Kategori ve depoları açılır listeler için bir kez yükler (backend en fazla 100 kayıt verir) */
  private loadOptions(): void {
    const all = { page: 1, limit: 100, sortBy: 'name', order: 'asc' as const };
    forkJoin([this.categoriesService.list(all), this.warehousesService.list(all)]).subscribe({
      next: ([categories, warehouses]) => {
        this.categoryOptions.set(categories.data.map((c) => ({ label: c.name, value: c.id })));
        this.warehouseOptions.set(warehouses.data.map((w) => ({ label: w.name, value: w.id })));
      },
      error: (err: unknown) => this.message.error(errorMessage(err)),
    });
  }

  private setQuery(change: Partial<ProductQuery>): void {
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

  /** Filtre değişince ilk sayfaya dönülür. Seçim temizlenirse değer null gelir. */
  protected onCategoryFilter(categoryId: number | null): void {
    this.setQuery({ categoryId: categoryId ?? undefined, page: 1 });
  }

  protected onWarehouseFilter(warehouseId: number | null): void {
    this.setQuery({ warehouseId: warehouseId ?? undefined, page: 1 });
  }

  protected onLowStockFilter(checked: boolean): void {
    // İşaretli değilse filtre hiç gönderilmez (tüm ürünler)
    this.setQuery({ lowStock: checked || undefined, page: 1 });
  }

  /** Stok kritik seviyede veya altında mı? (backend'deki lowStock filtresiyle aynı kural) */
  protected isLowStock(product: Product): boolean {
    return product.stock <= product.criticalStock;
  }

  // ---- Ekleme / düzenleme penceresi ----
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Product | null>(null);
  protected readonly saving = signal(false);

  // Kurallar backend'deki CreateProductDto ile aynı
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    sku: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(SKU_PATTERN)]],
    description: ['', Validators.maxLength(1000)],
    categoryId: new FormControl<number | null>(null, Validators.required),
    warehouseId: new FormControl<number | null>(null, Validators.required),
    price: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(99999999.99),
    ]),
    criticalStock: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
  });

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset();
    this.form.controls.stock.enable(); // başlangıç stoğu yalnızca eklemede girilir
    this.modalOpen.set(true);
  }

  protected openEdit(product: Product): void {
    this.editing.set(product);
    this.form.reset({
      name: product.name,
      sku: product.sku,
      description: product.description ?? '',
      categoryId: product.categoryId,
      warehouseId: product.warehouseId,
      price: product.price,
      criticalStock: product.criticalStock,
      stock: product.stock,
    });
    // Stok düzenlemede değiştirilemez; stok artırma/azaltma ile değişir
    this.form.controls.stock.disable();
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  /** SKU yazarken harfleri büyük harfe çevirir (backend de çeviriyor; kullanıcı doğrusunu görsün) */
  protected upperSku(): void {
    const control = this.form.controls.sku;
    control.setValue(control.value.toUpperCase(), { emitEvent: false });
  }

  protected save(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }

    const value = this.form.getRawValue();
    const editing = this.editing();
    const input = {
      name: value.name.trim(),
      sku: value.sku.trim(),
      // Açıklama boşsa: eklemede hiç gönderme, düzenlemede null gönder (mevcut açıklama silinsin)
      description: value.description.trim() || (editing ? null : undefined),
      // Form geçerliyse bu alanlar dolu (Validators.required)
      categoryId: value.categoryId!,
      warehouseId: value.warehouseId!,
      price: value.price!,
      criticalStock: value.criticalStock,
    };

    this.saving.set(true);
    const request = editing
      ? this.service.update(editing.id, input)
      : this.service.create({ ...input, stock: value.stock });

    request.subscribe({
      next: () => {
        this.message.success(editing ? 'Ürün güncellendi' : 'Ürün eklendi');
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

  protected remove(product: Product): void {
    this.service.remove(product.id).subscribe({
      next: () => {
        this.message.success(`"${product.name}" silindi`);
        const { page } = this.query();
        if (this.rows().length === 1 && page > 1) this.setQuery({ page: page - 1 });
        else this.load();
      },
      error: (err: unknown) => this.message.error(errorMessage(err)),
    });
  }
}