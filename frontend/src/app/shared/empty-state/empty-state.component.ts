import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ButtonComponent } from '../button/button.component';

/** A centred icon, one sentence and one primary action (requirement 23.3). */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state" role="status">
      <div class="empty-state__icon" aria-hidden="true">{{ icon() }}</div>
      <p class="empty-state__message">{{ message() }}</p>
      @if (actionLabel()) {
        <app-button variant="primary" (click)="action.emit()">{{ actionLabel() }}</app-button>
      }
    </div>
  `,
  styles: [
    `
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-12) var(--space-4);
        text-align: center;
      }
      .empty-state__icon {
        font-size: var(--font-size-48);
        line-height: 1;
      }
      .empty-state__message {
        margin: 0;
        color: var(--color-text-muted);
        font-size: var(--font-size-16);
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly message = input.required<string>();
  readonly icon = input('📦');
  readonly actionLabel = input<string | null>(null);
  readonly action = output<void>();
}
