import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { apiErrorMessage, readApiError } from '../../core/api/api-error';
import { ButtonComponent } from '../../shared/button/button.component';
import { FieldComponent } from '../../shared/field/field.component';
import { ToastService } from '../../shared/toast/toast.service';
import { AdminBrand, DUPLICATE_BRAND_MESSAGE } from './admin-brand.model';
import { AdminBrandsService } from './admin-brands.service';

/**
 * The create and edit brand form: name and description (requirement 13.6).
 * Shown inside a dialog on the brand list.
 */
@Component({
  selector: 'app-brand-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <app-field label="Name" controlId="brand-name" [error]="errorFor('name')" required>
        <input
          id="brand-name"
          type="text"
          formControlName="name"
          [attr.aria-invalid]="errorFor('name') ? 'true' : null"
          [attr.aria-describedby]="errorFor('name') ? 'brand-name-error' : null"
        />
      </app-field>

      <app-field label="Description" controlId="brand-description">
        <textarea id="brand-description" rows="4" formControlName="description"></textarea>
      </app-field>

      @if (formError()) {
        <p class="text-error" role="alert">{{ formError() }}</p>
      }

      <div class="actions">
        <app-button type="submit" variant="primary" [loading]="saving()">
          {{ brand() ? 'Save brand' : 'Create brand' }}
        </app-button>
        <app-button type="button" variant="secondary" [disabled]="saving()" (click)="cancel()">
          Cancel
        </app-button>
      </div>
    </form>
  `,
  styles: [
    `
      input,
      textarea {
        width: 100%;
        padding: 0 var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-field);
        background: var(--color-surface);
        font: inherit;
      }
      input {
        height: 44px;
      }
      textarea {
        padding: var(--space-2) var(--space-3);
        resize: vertical;
      }
      input:focus,
      textarea:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-soft);
        outline: none;
      }
      .actions {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
        margin-top: var(--space-4);
      }
      .text-error {
        color: var(--color-error);
        font-size: var(--font-size-14);
      }
    `,
  ],
})
export class BrandFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminBrandsService);
  private readonly toast = inject(ToastService);

  /** The brand being edited, or null to create a new one. */
  readonly brand = input<AdminBrand | null>(null);

  readonly saved = output<AdminBrand>();
  readonly cancelled = output<void>();

  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  private submitted = false;

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
  });

  constructor() {
    effect(() => {
      const brand = this.brand();
      if (brand) {
        this.form.patchValue({
          name: brand.name,
          description: brand.description ?? '',
        });
      }
    });
  }

  errorFor(control: 'name'): string | null {
    const field = this.form.controls[control];
    if (!field || field.valid) {
      return null;
    }
    if (!this.submitted && !field.touched) {
      return null;
    }
    return 'Enter a brand name';
  }

  submit(): void {
    this.submitted = true;
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload = {
      name: String(value.name ?? '').trim(),
      description: String(value.description ?? '').trim() || null,
    };
    this.saving.set(true);
    const request = this.brand()
      ? this.service.update(this.brand()!.id, payload)
      : this.service.create(payload);
    request.subscribe({
      next: (brand) => {
        this.saving.set(false);
        this.toast.success(this.brand() ? 'Brand saved' : 'Brand created');
        this.saved.emit(brand);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const body = readApiError(error);
        this.formError.set(body.code === 'duplicate_brand' ? DUPLICATE_BRAND_MESSAGE : body.message);
      },
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}