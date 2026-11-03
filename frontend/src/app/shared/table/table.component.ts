import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
}

/**
 * A data table: 56 px rows, a sticky header in `--color-bg`, sortable column
 * headers with an arrow and row hover in `--color-primary-soft`.
 */
@Component({
  selector: 'app-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-wrap">
      <table class="table">
        <caption class="visually-hidden">{{ caption() }}</caption>
        <thead>
          <tr>
            @for (column of columns(); track column.key) {
              <th
                scope="col"
                [style.text-align]="column.align || 'left'"
                [attr.aria-sort]="ariaSort(column)"
              >
                @if (column.sortable) {
                  <button
                    type="button"
                    class="table__sort"
                    (click)="toggleSort(column.key)"
                  >
                    {{ column.label }}
                    <span aria-hidden="true">{{ sortArrow(column.key) }}</span>
                  </button>
                } @else {
                  {{ column.label }}
                }
              </th>
            }
          </tr>
        </thead>
        <tbody>
          <ng-content />
        </tbody>
      </table>
    </div>
  `,
  styles: [
    `
      .table-wrap {
        overflow-x: auto;
        background: var(--color-surface);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-resting);
      }
      .table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--font-size-14);
      }
      th {
        position: sticky;
        top: 0;
        background: var(--color-bg);
        padding: var(--space-3) var(--space-4);
        font-weight: 600;
        border-bottom: 1px solid var(--color-border);
        white-space: nowrap;
      }
      td {
        padding: var(--space-3) var(--space-4);
        height: 56px;
        border-bottom: 1px solid var(--color-border);
      }
      tbody tr:hover {
        background: var(--color-primary-soft);
      }
      .table__sort {
        border: 0;
        background: transparent;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
        padding: 0;
      }
    `,
  ],
})
export class TableComponent {
  readonly columns = input.required<TableColumn[]>();
  readonly caption = input('Data table');
  readonly sortKey = input<string | null>(null);
  readonly sortDirection = input<'asc' | 'desc'>('asc');

  private readonly sortState = { key: null as string | null, direction: 'asc' as 'asc' | 'desc' };

  toggleSort(key: string): void {
    if (this.sortState.key === key) {
      this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortState.key = key;
      this.sortState.direction = 'asc';
    }
  }

  sortArrow(key: string): string {
    if (this.sortState.key !== key) {
      return '↕';
    }
    return this.sortState.direction === 'asc' ? '↑' : '↓';
  }

  ariaSort(column: TableColumn): string | null {
    if (!column.sortable) {
      return null;
    }
    if (this.sortState.key !== column.key) {
      return 'none';
    }
    return this.sortState.direction === 'asc' ? 'ascending' : 'descending';
  }
}
