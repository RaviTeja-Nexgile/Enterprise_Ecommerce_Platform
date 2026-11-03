import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { ButtonComponent } from '../../shared/button/button.component';
import { DialogComponent } from '../../shared/dialog/dialog.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { TableColumn, TableComponent } from '../../shared/table/table.component';
import { AdminBrand } from './admin-brand.model';
import { AdminBrandsService } from './admin-brands.service';
import { BrandFormComponent } from './brand-form.component';

/**
 * `/admin/brands`: the brand list with create and edit (requirement 13.6).
 * A saved brand is offered in the product form's brand list.
 */
@Component({
  selector: 'app-brand-list',
  standalone: true,
  imports: [
    ButtonComponent,
    DialogComponent,
    EmptyStateComponent,
    SkeletonComponent,
    TableComponent,
    BrandFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <h1 class="page__title">Brands</h1>
          <p class="page__subtitle">Manage the brands offered in the product form.</p>
        </div>
        <app-button variant="primary" (click)="openNew()">New brand</app-button>
      </header>

      @if (loading()) {
        <div class="loading" aria-busy="true" aria-label="Loading brands">
          @for (row of skeletonRows; track row) {
            <app-skeleton height="56px" />
          }
        </div>
      } @else if (brands().length === 0) {
        <app-empty-state
          message="No brands yet."
          icon="🏷️"
          actionLabel="Create the first brand"
          (action)="openNew()"
        />
      } @else {
        <app-table [columns]="columns" caption="Brands">
          @for (brand of brands(); track brand.id) {
            <tr>
              <td class="cell__name">{{ brand.name }}</td>
              <td>{{ brand.description || '—' }}</td>
              <td>
                <app-button variant="ghost" (click)="openEdit(brand)">Edit</app-button>
              </td>
            </tr>
          }
        </app-table>
      }

      <app-dialog
        [open]="dialogOpen()"
        [title]="editing() ? 'Edit brand' : 'New brand'"
        (closed)="closeDialog()"
      >
        <app-brand-form
          [brand]="editing()"
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
      .cell__name {
        font-weight: 600;
      }
    `,
  ],
})
export class BrandListComponent implements OnInit {
  private readonly service = inject(AdminBrandsService);

  readonly columns: TableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'actions', label: 'Actions' },
  ];

  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly brands = signal<AdminBrand[]>([]);
  readonly loading = signal(true);
  readonly dialogOpen = signal(false);
  readonly editing = signal<AdminBrand | null>(null);

  ngOnInit(): void {
    this.load();
  }

  openNew(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(brand: AdminBrand): void {
    this.editing.set(brand);
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

  private load(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (answer) => {
        this.brands.set(answer.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.brands.set([]);
        this.loading.set(false);
      },
    });
  }
}