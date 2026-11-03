import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { apiErrorMessage } from '../../core/api/api-error';
import { ButtonComponent } from '../../shared/button/button.component';
import { FieldComponent } from '../../shared/field/field.component';
import { ToastService } from '../../shared/toast/toast.service';
import { AdminCategory, categorySubtreeIds } from './admin-category.model';
import { AdminCategoriesService, CategoryRow } from './admin-categories.service';

/**
 * The create and edit category form: name, description and an optional parent
 * category (requirement 13.2). Shown inside a dialog on the category tree.
 */
@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <app-field
        label="Name"
        controlId="category-name"
        [error]="errorFor('name')"
        required
      >
        <input
          id="category-name"
          type="text"
          formControlName="name"
          [attr.aria-invalid]="errorFor('name') ? 'true' : null"
          [attr.aria-describedby]="errorFor('name') ? 'category-name-error' : null"
        />
      </app-field>

      <app-field label="Description" controlId="category-description">
        <textarea id="category-description" rows="4" formControlName="description"></textarea>
      </app-field>

      <app-field
        label="Parent category"
        controlId="category-parent"
        hint="Leave empty to make this a top-level category."
      >
        <select id="category-parent" formControlName="parent_id">
          <option value="">No parent</option>
          @for (row of parentOptions(); track row.category.id) {
            <option [value]="row.category.id">{{ indent(row.depth) }}{{ row.category.name }}</option>
          }
        </select>
      </app-field>

      <app-field label="Status" controlId="category-status">
        <select id="category-status" formControlName="status">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </app-field>

      @if (formError()) {
        <p class="text-error" role="alert">{{ formError() }}</p>
      }

      <div class="actions">
        <app-button type="submit" variant="primary" [loading]="saving()">
          {{ category() ? 'Save category' : 'Create category' }}
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
      select,
      textarea {
        width: 100%;
        padding: 0 var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-field);
        background: var(--color-surface);
        font: inherit;
      }
      input,
      select {
        height: 44px;
      }
      textarea {
        padding: var(--space-2) var(--space-3);
        resize: vertical;
      }
      input:focus,
      select:focus,
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
export class CategoryFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminCategoriesService);
  private readonly toast = inject(ToastService);

  /** The category being edited, or null to create a new one. */
  readonly category = input<AdminCategory | null>(null);
  /** Every category in the tree, for the parent select. */
  readonly tree = input<AdminCategory[]>([]);

  readonly saved = output<AdminCategory>();
  readonly cancelled = output<void>();

  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  private submitted = false;

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    parent_id: [''],
    status: ['active'],
  });

  /** Parent options exclude the edited category and its descendants. */
  readonly parentOptions = computed<CategoryRow[]>(() => {
    const edited = this.category();
    const excluded = edited ? new Set(categorySubtreeIds(edited)) : new Set<number>();
    const rows: CategoryRow[] = [];
    const walk = (nodes: AdminCategory[], depth: number): void => {
      for (const node of nodes) {
        if (!excluded.has(node.id)) {
          rows.push({ category: node, depth });
        }
        if (node.children?.length) {
          walk(node.children, depth + 1);
        }
      }
    };
    walk(this.tree(), 0);
    return rows;
  });

  constructor() {
    effect(() => {
      const category = this.category();
      if (category) {
        this.form.patchValue({
          name: category.name,
          description: category.description ?? '',
          parent_id: category.parent_id ? String(category.parent_id) : '',
          status: category.status,
        });
      }
    });
  }

  indent(depth: number): string {
    return depth > 0 ? `${'— '.repeat(depth)}` : '';
  }

  errorFor(control: 'name'): string | null {
    const field = this.form.controls[control];
    if (!field || field.valid) {
      return null;
    }
    if (!this.submitted && !field.touched) {
      return null;
    }
    return 'Enter a category name';
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
      parent_id: value.parent_id ? Number(value.parent_id) : null,
      status: (value.status as 'active' | 'inactive') || 'active',
    };
    this.saving.set(true);
    const request = this.category()
      ? this.service.update(this.category()!.id, payload)
      : this.service.create(payload);
    request.subscribe({
      next: (category) => {
        this.saving.set(false);
        this.toast.success(this.category() ? 'Category saved' : 'Category created');
        this.saved.emit(category);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(error));
      },
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}