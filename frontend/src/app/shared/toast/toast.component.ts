import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-region" aria-live="polite">
      @for (toast of toasts(); track toast.id) {
        <div
          class="toast"
          [class.toast--success]="toast.kind === 'success'"
          [class.toast--error]="toast.kind === 'error'"
          [class.toast--info]="toast.kind === 'info'"
          [attr.role]="toast.role"
        >
          <span class="toast__message">{{ toast.message }}</span>
          <button
            type="button"
            class="toast__close"
            [attr.aria-label]="'Dismiss: ' + toast.message"
            (click)="dismiss(toast.id)"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-region {
        position: fixed;
        right: var(--space-6);
        bottom: var(--space-6);
        z-index: 1200;
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        max-width: 360px;
      }
      .toast {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        background: var(--color-surface);
        border-left: 4px solid var(--color-primary);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-hover);
        color: var(--color-text);
      }
      .toast--success {
        border-left-color: var(--color-success);
      }
      .toast--error {
        border-left-color: var(--color-error);
      }
      .toast--info {
        border-left-color: var(--color-primary);
      }
      .toast__message {
        flex: 1;
        font-size: var(--font-size-14);
      }
      .toast__close {
        border: 0;
        background: transparent;
        font-size: var(--font-size-18);
        line-height: 1;
        cursor: pointer;
        color: var(--color-text-muted);
      }
      @media (max-width: 767px) {
        .toast-region {
          left: var(--space-3);
          right: var(--space-3);
          top: var(--space-3);
          bottom: auto;
          max-width: none;
        }
      }
    `,
  ],
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
