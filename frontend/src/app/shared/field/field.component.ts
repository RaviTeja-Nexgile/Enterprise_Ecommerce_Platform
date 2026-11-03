import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * A labelled form field wrapper: a visible label above, helper text below and
 * the error text linked to the control with `aria-describedby`
 * (requirements 1.11, 21.3 and 21.7).
 *
 * The control inside gets `aria-invalid` and `aria-describedby` from the
 * `controlId` and `errorId` this component exposes.
 */
@Component({
  selector: 'app-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field" [class.field--invalid]="!!error()">
      <label class="field__label" [attr.for]="controlId()">
        {{ label() }}
        @if (required()) {
          <span class="field__required" aria-hidden="true">*</span>
        }
      </label>
      <ng-content />
      @if (error()) {
        <p class="field__error" [id]="errorId()" role="alert">{{ error() }}</p>
      } @else if (hint()) {
        <p class="field__hint" [id]="hintId()">{{ hint() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .field {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        margin-bottom: var(--space-4);
      }
      .field__label {
        font-size: var(--font-size-14);
        font-weight: 600;
        color: var(--color-text);
      }
      .field__required {
        color: var(--color-error);
        margin-left: 2px;
      }
      .field__error {
        margin: 0;
        font-size: var(--font-size-12);
        color: var(--color-error);
      }
      .field__hint {
        margin: 0;
        font-size: var(--font-size-12);
        color: var(--color-text-muted);
      }
      .field--invalid :is(input, select, textarea) {
        border-color: var(--color-error);
      }
    `,
  ],
})
export class FieldComponent {
  readonly label = input.required<string>();
  readonly controlId = input.required<string>();
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly required = input(false, { transform: booleanAttribute });

  readonly errorId = computed(() => `${this.controlId()}-error`);
  readonly hintId = computed(() => `${this.controlId()}-hint`);

  /** The `aria-describedby` value for the control inside. */
  readonly describedBy = computed(() =>
    this.error() ? this.errorId() : this.hint() ? this.hintId() : null,
  );
}
