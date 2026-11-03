import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { ButtonComponent } from '../../shared/button/button.component';
import { DialogComponent } from '../../shared/dialog/dialog.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { TableColumn, TableComponent } from '../../shared/table/table.component';
import { ToastService } from '../../shared/toast/toast.service';
import { AdminCategory, CATEGORY_DELETED_MESSAGE } from './admin-category.model';
import { AdminCategoriesService, CategoryRow, flattenCategoryTree } from './admin-categories.service';
import { CategoryFormComponent } from './category-form.component';

/**
 * `/admin/categories`: the categories as a tree with each category's name,
 * status, product count and order, plus create, edit, reorder, status change
 * and delete (requirements 13.1 to 13.5).
 */
@Component({
  selector: 'app-category-tree',
  standalone: true,
  imports: [
    ButtonComponent,
    DialogComponent,
    EmptyStateComponent,
    SkeletonComponent,
    TableComponent,
    CategoryFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <h1 class="page__title">Categories</h1>
          <p class="page__subtitle">Organize products into a category tree.</p>
        </div>
        <app-button variant="primary" (click)="openNew()">New category</app-button>
      </header>

      @if (loading()) {
        <div class="loading" aria-busy="true" aria-label="Loading categories">
          @for (row of skeletonRows; track row) {
            <app-skeleton height="56px" />
          }
        </div>
      } @else if (rows().length === 0) {
        <app-empty-state
          message="No categories yet."
          icon="🗂️"
          actionLabel="Create the first category"
          (action)="openNew()"
        />
      } @else {
        <app-table [columns]="columns" caption="Categories">
          @for (row of rows(); track row.category.id) {
            <tr>
              <td>
                <span class="tree-name" [style.padding-left.px]="row.depth * 20">
                  {{ row.category.name }}
                </span>
              </td>
              <td>
                <select
                  class="status-select"
                  [attr.aria-label]="'Status of ' + row.category.name"
                  [value]="row.category.status"
                  (change)="changeStatus(row.category, $any($event.target).value)"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </td>
              <td class="cell--right">{{ row.category.product_count ?? 0 }}</td>
              <td>
                <input
                  class="order-input"
                  type="number"
                  min="0"
                  step="1"
                  [attr.aria-label]="'Order of ' + row.category.name"
                  [value]="row.category.sort_order"
                  (change)="changeOrder(row.category, $any($event.target).value)"
                />
              </td>
              <td>
                <div class="row-actions">
                  <app-button variant="ghost" (click)="openEdit(row.category)">Edit</app-button>
                  <app-button variant="destructive" (click)="remove(row.category)">Delete</app-button>
                </div>
              </td>
            </tr>
          }
        </app-table>
      }

      <app-dialog
        [open]="dialogOpen()"
        [title]="editing() ? 'Edit category' : 'New category'"
        (closed)="closeDialog()"
      >
        <app-category-form
          [category]="editing()"
          [tree]="tree()"
          (saved)="onSaved()"
          (cancelled)="closeDialog()"
        />
      </app-dialog>
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
      .loading {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .tree-name {
        font-weight: 600;
      }
      .cell--right {
        text-align: right;
      }
      .status-select,
      .order-input {
        height: 40px;
        padding: 0 var(--space-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-field);
        background: var(--color-surface);
        font: inherit;
      }
      .order-input {
        width: 72px;
      }
      .status-select:focus,
      .order-input:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-soft);
        outline: none;
      }
      .row-actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }
    `,
  ],
})
export class CategoryTreeComponent implements OnInit {
  private readonly service = inject(AdminCategoriesService);
  private readonly toast = inject(ToastService);

  readonly columns: TableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'products', label: 'Products', align: 'right' },
    { key: 'order', label: 'Order' },
    { key: 'actions', label: 'Actions' },
  ];

  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly tree = signal<AdminCategory[]>([]);
  readonly rows = signal<CategoryRow[]>([]);
  readonly loading = signal(true);
  readonly dialogOpen = signal(false);
  readonly editing = signal<AdminCategory | null>(null);

  ngOnInit(): void {
    this.load();
  }

  openNew(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(category: AdminCategory): void {
    this.editing.set(category);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  onSaved(): void {
    this.closeDialog();
    this.load();
  }

  /**
   * Save a status change and show the tree in the new order (requirement 13.3).
   * A failed request is already shown by the error interceptor, so it only
   * reloads the tree to drop the unsaved selection.
   */
  changeStatus(category: AdminCategory, status: string): void {
    this.service.update(category.id, { status: status as 'active' | 'inactive' }).subscribe({
      next: () => {
        this.toast.success('Category updated');
        this.load();
      },
      error: () => this.load(),
    });
  }

  /** Save a new order and show the tree in the new order (requirement 13.3). */
  changeOrder(category: AdminCategory, value: string): void {
    const sortOrder = Number(value);
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      return;
    }
    this.service.update(category.id, { sort_order: sortOrder }).subscribe({
      next: () => {
        this.toast.success('Category updated');
        this.load();
      },
      error: () => this.load(),
    });
  }

  /**
   * Delete a category; refuse when it still holds products (requirements 13.4
   * and 13.5). The refusal message comes from the API through the error
   * interceptor, so it is shown once.
   */
  remove(category: AdminCategory): void {
    this.service.delete(category.id).subscribe({
      next: () => {
        this.toast.success(CATEGORY_DELETED_MESSAGE);
        this.load();
      },
      error: () => this.load(),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.service.tree().subscribe({
      next: (answer) => {
        this.tree.set(answer.data ?? []);
        this.rows.set(flattenCategoryTree(answer.data ?? []));
        this.loading.set(false);
      },
      error: () => {
        this.tree.set([]);
        this.rows.set([]);
        this.loading.set(false);
      },
    });
  }
}