import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http/api-error';
import { Product } from '../products/product.models';
import { ProductsService } from '../products/products.service';
import {
  MOVEMENT_LABELS,
  MovementType,
  StockMovement,
  StockMovementQuery,
} from '../stock-movements/stock-movement.models';
import { StockMovementsService } from '../stock-movements/stock-movements.service';

/** Ürün detayı: bilgiler, stok işlemleri ve hareket geçmişi (/products/:id) */
@Component({
  selector: 'app-product-detail',
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzDescriptionsModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzModalModule,
    NzResultModule,
    NzSpinModule,
    NzTableModule,
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail {
  private readonly productsService = inject(ProductsService);
  private readonly movementsService = inject(StockMovementsService);
  private readonly message = inject(NzMessageService);
  protected readonly auth = inject(AuthService);
  protected readonly labels = MOVEMENT_LABELS;

  /** Adres çubuğundaki id (/products/5 → 5) */
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  // Yetkiler backend'deki @Roles ile aynı
  protected readonly canMove = this.auth.hasRole('ADMIN', 'WAREHOUSE_MANAGER', 'STAFF');
  protected readonly canAdjust = this.auth.hasRole('ADMIN', 'WAREHOUSE_MANAGER');

  // ---- Ürün ----
  protected readonly product = signal<Product | null>(null);
  protected readonly lastMovementAt = signal<string | null>(null);
  protected readonly notFound = signal(false);
  protected readonly isLowStock = computed(() => {
    const p = this.product();
    return p !== null && p.stock <= p.criticalStock;
  });

  // ---- Hareket geçmişi ----
  protected readonly query = signal<StockMovementQuery>({
    productId: this.id,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    order: 'desc',
  });
  protected readonly movements = signal<StockMovement[]>([]);
  protected readonly movementTotal = signal(0);
  protected readonly movementsLoading = signal(false);

  constructor() {
    this.loadProduct();
    this.loadMovements();
  }

  /** Ürün bilgisi ve son hareket zamanı birlikte yüklenir */
  private loadProduct(): void {
    forkJoin([
      this.productsService.get(this.id),
      this.movementsService.getProductStock(this.id),
    ]).subscribe({
      next: ([product, stock]) => {
        this.product.set(product);
        this.lastMovementAt.set(stock.lastMovementAt);
      },
      error: (err: unknown) => {
        // Olmayan id veya /products/abc gibi bir adres
        if (err instanceof HttpErrorResponse && (err.status === 404 || err.status === 400)) {
          this.notFound.set(true);
        } else {
          this.message.error(errorMessage(err));
        }
      },
    });
  }

  private loadMovements(): void {
    this.movementsLoading.set(true);
    this.movementsService.list(this.query()).subscribe({
      next: (res) => {
        this.movements.set(res.data);
        this.movementTotal.set(res.meta.total);
        this.movementsLoading.set(false);
      },
      error: (err: unknown) => {
        this.message.error(errorMessage(err));
        this.movementsLoading.set(false);
      },
    });
  }

  protected onPageChange(page: number): void {
    this.query.update((q) => ({ ...q, page }));
    this.loadMovements();
  }

  /** Tabloda miktarın yanında gösterilen işaret: +10, −5 */
  protected signedChange(m: StockMovement): string {
    const diff = m.newStock - m.previousStock;
    return diff > 0 ? `+${diff}` : diff < 0 ? `−${-diff}` : '0';
  }

  // ---- Stok işlemi penceresi (giriş / çıkış / sayım) ----
  protected readonly mode = signal<MovementType | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(1_000_000)]],
    note: ['', Validators.maxLength(255)],
  });

  protected open(mode: MovementType): void {
    const isAdjustment = mode === 'ADJUSTMENT';
    // Sayımda girilen değer "gerçek stok" olduğu için 0 olabilir ve mevcut stokla başlar
    this.form.controls.quantity.setValidators([
      Validators.required,
      Validators.min(isAdjustment ? 0 : 1),
      Validators.max(1_000_000),
    ]);
    this.form.reset({ quantity: isAdjustment ? (this.product()?.stock ?? 0) : 1, note: '' });
    this.mode.set(mode);
  }

  protected close(): void {
    this.mode.set(null);
  }

  protected save(): void {
    const mode = this.mode();
    if (!mode) return;
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }

    const { quantity, note } = this.form.getRawValue();
    const input = { quantity, note: note.trim() || undefined };
    const request =
      mode === 'IN'
        ? this.movementsService.increase(this.id, input)
        : mode === 'OUT'
          ? this.movementsService.decrease(this.id, input)
          : this.movementsService.adjust(this.id, quantity, input.note);

    this.saving.set(true);
    request.subscribe({
      next: (movement) => {
        this.message.success(
          `${this.labels[mode]} kaydedildi: stok ${movement.previousStock} → ${movement.newStock}`,
        );
        this.saving.set(false);
        this.mode.set(null);
        // Yeni stok ve geçmişin ilk sayfası yeniden yüklenir
        this.loadProduct();
        this.query.update((q) => ({ ...q, page: 1 }));
        this.loadMovements();
      },
      error: (err: unknown) => {
        // Ör. "Yetersiz stok: mevcut 8, çıkarılmak istenen 20". Pencere açık kalır.
        this.message.error(errorMessage(err));
        this.saving.set(false);
      },
    });
  }
}