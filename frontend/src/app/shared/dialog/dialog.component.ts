import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * A modal dialog that moves focus into itself when it opens and returns focus
 * to the control that opened it when it closes (requirements 21.2 and 21.8).
 * Escape closes it.
 */
@Component({
  selector: 'app-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="dialog-backdrop" (click)="onBackdrop()">
        <div
          #panel
          class="dialog"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId()"
          tabindex="-1"
          (click)="$event.stopPropagation()"
          (keydown)="onKeydown($event)"
        >
          <header class="dialog__header">
            <h2 class="dialog__title" [id]="titleId()">{{ title() }}</h2>
            <button type="button" class="dialog__close" aria-label="Close dialog" (click)="close()">
              ×
            </button>
          </header>
          <div class="dialog__body">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .dialog-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(17, 24, 39, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1100;
        padding: var(--space-4);
      }
      .dialog {
        background: var(--color-surface);
        border-radius: var(--radius-dialog);
        box-shadow: var(--elevation-hover);
        width: min(560px, 100%);
        max-height: 90vh;
        overflow: auto;
        padding: var(--space-6);
      }
      .dialog__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--space-4);
      }
      .dialog__title {
        margin: 0;
        font-size: var(--font-size-18);
      }
      .dialog__close {
        border: 0;
        background: transparent;
        font-size: var(--font-size-24);
        line-height: 1;
        cursor: pointer;
        color: var(--color-text-muted);
      }
    `,
  ],
})
export class DialogComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly closeOnBackdrop = input(true);
  readonly closed = output<void>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private opener: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (isOpen) {
        this.opener = document.activeElement as HTMLElement | null;
        queueMicrotask(() => this.panel()?.nativeElement.focus());
      } else if (this.opener) {
        this.opener.focus();
        this.opener = null;
      }
    });
  }

  titleId(): string {
    return 'dialog-title';
  }

  close(): void {
    this.closed.emit();
  }

  onBackdrop(): void {
    if (this.closeOnBackdrop()) {
      this.close();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.close();
    }
  }
}
