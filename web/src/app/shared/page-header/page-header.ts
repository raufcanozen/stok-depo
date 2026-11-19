import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
})
export class PageHeader {
  readonly title = input.required<string>();
  /** Filtreye uyan toplam kayıt sayısı (yüklenmediyse null) */
  readonly total = input<number | null>(null);
}