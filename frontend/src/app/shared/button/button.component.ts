import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

/**
 * The shared button: primary filled, secondary outlined, ghost text-only and
 * destructive filled, with the sizes and states of design.md "Look and feel".
 */
@Component({
  selector: 'app-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      class="btn"
      [class.btn--primary]="variant() === 'primary'"
      [class.btn--secondary]="variant() === 'secondary'"
      [class.btn--ghost]="variant() === 'ghost'"
      [class.btn--destructive]="variant() === 'destructive'"
      [class.btn--block]="block()"
      [class.btn--loading]="loading()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading() ? 'true' : null"
    >
      <ng-content />
    </button>
  `,
  styles: [
    `
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        min-height: 40px;
        padding: 0 var(--space-4);
        border: 1px solid transparent;
        border-radius: var(--radius-button);
        font-weight: 600;
        font-size: var(--font-size-14);
        cursor: pointer;
        transition:
          background-color 120ms ease,
          transform 80ms ease,
          box-shadow 120ms ease;
      }
      .btn:active:not(:disabled) {
        transform: scale(0.98);
      }
      .btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .btn--primary {
        background: var(--color-primary);
        color: #ffffff;
      }
      .btn--primary:hover:not(:disabled) {
        background: var(--color-primary-hover);
      }
      .btn--secondary {
        background: var(--color-surface);
        color: var(--color-text);
        border-color: var(--color-border);
      }
      .btn--secondary:hover:not(:disabled) {
        background: var(--color-primary-soft);
      }
      .btn--ghost {
        background: transparent;
        color: var(--color-primary);
      }
      .btn--ghost:hover:not(:disabled) {
        background: var(--color-primary-soft);
      }
      .btn--destructive {
        background: var(--color-error);
        color: #ffffff;
      }
      .btn--block {
        width: 100%;
      }
      .btn--loading {
        cursor: progress;
      }
      @media (max-width: 767px) {
        .btn {
          min-height: 48px;
        }
      }
    `,
  ],
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly block = input(false);
}
