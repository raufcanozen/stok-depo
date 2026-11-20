import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { ROLE_LABELS, Role } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  link: string;
  /** Boşsa herkes görür; doluysa yalnızca bu roller */
  roles?: Role[];
}

/** Yan menü. Her yeni sayfa için buraya bir satır eklenir. */
const MENU: MenuItem[] = [
  { label: 'Kategoriler', icon: 'tags', link: '/categories' },
  { label: 'Depolar', icon: 'home', link: '/warehouses' },
  { label: 'Tedarikçiler', icon: 'shop', link: '/suppliers' },
];

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NzButtonModule,
    NzIconModule,
    NzLayoutModule,
    NzMenuModule,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {
  protected readonly auth = inject(AuthService);
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly menu = computed(() =>
    MENU.filter((item) => !item.roles || this.auth.hasRole(...item.roles)),
  );
}