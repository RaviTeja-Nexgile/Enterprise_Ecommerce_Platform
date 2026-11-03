import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Previous/next pagination with the current page and the page count. */
@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav class="pagination" aria-label="Pagination">
        <button
          type="button"
          class="pagination__button"
          [disabled]="page() <= 1"
          (click)="go(page() - 1)"
        >
          Previous
        </button>
        <span class="pagination__status" role="status">
          Page {{ page() }} of {{ totalPages() }}
        </span>
        <button
          type="button"
          class="pagination__button"
          [disabled]="page() >= totalPages()"
          (click)="go(page() + 1)"
        >
          Next
        </button>
      </nav>
    }
  `,
  styles: [
    `
      .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-4);
        padding: var(--space-4) 0;
      }
      .pagination__button {
        min-height: 40px;
        padding: 0 var(--space-4);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-button);
        background: var(--color-surface);
        cursor: pointer;
        font-weight: 600;
      }
      .pagination__button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .pagination__status {
        font-size: var(--font-size-14);
        color: var(--color-text-muted);
      }
    `,
  ],
})
export class PaginationComponent {
  readonly page = input(1);
  readonly totalPages = input(1);
  readonly pageChange = output<number>();

  readonly canGoBack = computed(() => this.page() > 1);

  go(target: number): void {
    if (target < 1 || target > this.totalPages() || target === this.page()) {
      return;
    }
    this.pageChange.emit(target);
  }
}
