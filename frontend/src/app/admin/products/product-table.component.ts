import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../core/api/api-error';
import { MoneyPipe } from '../../core/format/money.pipe';
import { PageMeta } from '../../core/models/api.model';
import { Brand, Category } from '../../core/models/catalog.model';
import { ButtonComponent } from '../../shared/button/button.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { TableColumn, TableComponent } from '../../shared/table/table.component';
import { ToastService } from '../../shared/toast/toast.service';
import {
  AdminProduct,
  BulkAction,
  statusLabel,
} from './admin-product.model';
import { AdminProductsService, flattenCategories } from './admin-products.service';

const EMPTY_META: PageMeta = { page: 1, per_page: 20, total: 0, total_pages: 0 };

/**
 * `/admin/products`: a searchable, filterable table of 20 rows with row
 * selection and the bulk publish, unpublish and archive actions
 * (requirements 12.1, 12.8, 12.9 and 12.10).
 */
@Component({
  selector: 'app-product-table',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonComponent,
    EmptyStateComponent,
    PaginationComponent,
    SkeletonComponent,
    TableComponent,
    MoneyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <h1 class="page__title">Products</h1>
          <p class="page__subtitle">Create, publish and archive the catalog.</p>
        </div>
        <a class="page__action" routerLink="/admin/products/new">
          <app-button variant="primary">New product</app-button>
        </a>
      </header>

      <form class="filters" role="search" (ngSubmit)="applyFilters()">
        <label class="filters__field">
          <span class="filters__label">Search</span>
          <input
            id="product-search"
            type="search"
            name="q"
            placeholder="Search by name or SKU"
            [(ngModel)]="search"
          />
        </label>
        <label class="filters__field">
          <span class="filters__label">Status</span>
          <select id="product-status" name="status" [(ngModel)]="status">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label class="filters__field">
          <span class="filters__label">Category</span>
          <select id="product-category" name="category" [(ngModel)]="category">
            <option value="">All categories</option>
            @for (row of categories(); track row.category.id) {
              <option [value]="row.category.slug">{{ row.category.name }}</option>
            }
          </select>
        </label>
        <label class="filters__field">
          <span class="filters__label">Brand</span>
          <select id="product-brand" name="brand" [(ngModel)]="brand">
            <option value="">All brands</option>
            @for (item of brands(); track item.id) {
              <option [value]="item.name">{{ item.name }}</option>
            }
          </select>
        </label>
        <app-button type="submit" variant="secondary">Apply filters</app-button>
      </form>

      @if (selected().length > 0) {
        <div class="bulk" role="region" aria-label="Bulk actions">
          <span class="bulk__count">{{ selected().length }} selected</span>
          <app-button variant="secondary" (click)="runBulk('publish')">Publish</app-button>
          <app-button variant="secondary" (click)="runBulk('unpublish')">Unpublish</app-button>
          <app-button variant="destructive" (click)="runBulk('archive')">Archive</app-button>
        </div>
      }

      @if (loading()) {
        <div class="loading" aria-busy="true" aria-label="Loading products">
          @for (row of skeletonRows; track row) {
            <app-skeleton height="56px" />
          }
        </div>
      } @else if (products().length === 0) {
        <app-empty-state
          message="No products yet."
          icon="📦"
          actionLabel="Create the first product"
          (action)="createFirst()"
        />
      } @else {
        <app-table [columns]="columns" caption="Products">
          @for (product of products(); track product.id) {
            <tr [class.row--selected]="isSelected(product.id)">
              <td class="cell--check">
                <input
                  type="checkbox"
                  [attr.aria-label]="'Select ' + product.name"
                  [checked]="isSelected(product.id)"
                  (change)="toggle(product.id, $any($event.target).checked)"
                />
              </td>
              <td>
                <a class="cell__link" [routerLink]="['/admin/products', product.id]">
                  {{ product.name }}
                </a>
              </td>
              <td>{{ product.sku }}</td>
              <td>{{ product.category || '—' }}</td>
              <td class="cell--right">{{ product.regular_price_cents | money }}</td>
              <td class="cell--right">{{ product.available_quantity }}</td>
              <td>
                <span class="status" [attr.data-status]="product.status">
                  {{ label(product.status) }}
                </span>
              </td>
            </tr>
          }
        </app-table>
        <app-pagination
          [page]="meta().page"
          [totalPages]="meta().total_pages"
          (pageChange)="goToPage($event)"
        />
      }
    </div>
  `,
  styles: [
    `
      .page {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .page__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        flex-wrap: wrap;
      }
      .page__title {
        margin: 0;
        font-size: var(--font-size-24);
      }
      .page__subtitle {
        margin: var(--space-1) 0 0;
        color: var(--color-text-muted);
        font-size: var(--font-size-14);
      }
      .page__action {
        text-decoration: none;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: var(--space-3);
        background: var(--color-surface);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-resting);
        padding: var(--space-4);
      }
      .filters__field {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        min-width: 160px;
        flex: 1 1 160px;
      }
      .filters__label {
        font-size: var(--font-size-12);
        font-weight: 600;
        color: var(--color-text-muted);
      }
      .filters input,
      .filters select {
        height: 44px;
        padding: 0 var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-field);
        background: var(--color-surface);
        font: inherit;
      }
      .filters input:focus,
      .filters select:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-soft);
        outline: none;
      }
      .bulk {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        flex-wrap: wrap;
        background: var(--color-primary-soft);
        border-radius: var(--radius-card);
        padding: var(--space-3) var(--space-4);
      }
      .bulk__count {
        font-weight: 600;
        font-size: var(--font-size-14);
      }
      .loading {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .cell--check {
        width: 48px;
      }
      .cell--right {
        text-align: right;
      }
      .cell__link {
        color: var(--color-primary);
        font-weight: 600;
        text-decoration: none;
      }
      .cell__link:hover {
        text-decoration: underline;
      }
      .row--selected {
        background: var(--color-primary-soft);
      }
      .status {
        display: inline-block;
        padding: 2px var(--space-3);
        border-radius: var(--radius-pill);
        font-size: var(--font-size-12);
        font-weight: 600;
        background: var(--color-bg);
        color: var(--color-text-muted);
      }
      .status[data-status='published'] {
        background: #e7f6ef;
        color: var(--color-success);
      }
      .status[data-status='draft'] {
        background: #fdf3e7;
        color: var(--color-warning);
      }
      .status[data-status='archived'] {
        background: #f3f4f6;
        color: var(--color-text-muted);
      }
    `,
  ],
})
export class ProductTableComponent implements OnInit {
  private readonly service = inject(AdminProductsService);
  private readonly toast = inject(ToastService);

  readonly columns: TableColumn[] = [
    { key: 'select', label: '' },
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price', align: 'right' },
    { key: 'stock', label: 'Stock', align: 'right' },
    { key: 'status', label: 'Status' },
  ];

  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly products = signal<AdminProduct[]>([]);
  readonly meta = signal<PageMeta>(EMPTY_META);
  readonly loading = signal(true);
  readonly selected = signal<number[]>([]);
  readonly categories = signal<{ category: Category; depth: number }[]>([]);
  readonly brands = signal<Brand[]>([]);

  search = '';
  status = '';
  category = '';
  brand = '';
  private page = 1;

  ngOnInit(): void {
    this.load();
    this.service.categories().subscribe({
      next: (answer) => this.categories.set(flattenCategories(answer.data ?? [])),
      error: () => this.categories.set([]),
    });
    this.service.brands().subscribe({
      next: (answer) => this.brands.set(answer.data ?? []),
      error: () => this.brands.set([]),
    });
  }

  label(status: string): string {
    return statusLabel(status);
  }

  isSelected(id: number): boolean {
    return this.selected().includes(id);
  }

  toggle(id: number, checked: boolean): void {
    this.selected.update((ids) =>
      checked ? [...ids.filter((value) => value !== id), id] : ids.filter((value) => value !== id),
    );
  }

  applyFilters(): void {
    this.page = 1;
    this.selected.set([]);
    this.load();
  }

  goToPage(page: number): void {
    this.page = page;
    this.selected.set([]);
    this.load();
  }

  createFirst(): void {
    this.applyFilters();
  }

  runBulk(action: BulkAction): void {
    const ids = this.selected();
    if (ids.length === 0) {
      return;
    }
    this.service.bulk(ids, action).subscribe({
      next: (answer) => {
        this.toast.success(`${answer.updated} product(s) updated`);
        this.selected.set([]);
        this.load();
      },
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .list({
        q: this.search.trim() || undefined,
        status: this.status || undefined,
        category: this.category || undefined,
        brand: this.brand || undefined,
        page: this.page,
        per_page: 20,
      })
      .subscribe({
        next: (answer) => {
          this.products.set(answer.data ?? []);
          this.meta.set(answer.meta ?? EMPTY_META);
          this.loading.set(false);
        },
        error: () => {
          this.products.set([]);
          this.meta.set(EMPTY_META);
          this.loading.set(false);
        },
      });
  }
}
