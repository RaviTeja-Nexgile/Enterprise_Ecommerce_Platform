import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiClient } from '../../core/api/api-client.service';
import { Address } from '../../core/models/order.model';
import { ButtonComponent } from '../../shared/button/button.component';
import { CardComponent } from '../../shared/card/card.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { FieldComponent } from '../../shared/field/field.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { ToastService } from '../../shared/toast/toast.service';

type AddressField = 'line1' | 'city' | 'postal_code' | 'country';

/**
 * `/account/addresses` — the address book: list, add, edit, delete and set a
 * default address (requirement 9.4).
 */
@Component({
  selector: 'app-account-addresses',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    FieldComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="addresses__header">
      <h1 class="page-title">Addresses</h1>
      @if (!editing()) {
        <app-button variant="primary" (click)="startCreate()">Add address</app-button>
      }
    </div>

    @if (editing()) {
      <app-card [title]="editingId() ? 'Edit address' : 'New address'">
        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          <div class="form-grid">
            <app-field label="Address type" controlId="address-type">
              <select id="address-type" formControlName="type">
                <option value="shipping">Shipping</option>
                <option value="billing">Billing</option>
              </select>
            </app-field>
            <app-field label="Country" controlId="address-country" [error]="errorFor('country')" required>
              <input
                id="address-country"
                type="text"
                formControlName="country"
                autocomplete="country-name"
                [attr.aria-invalid]="errorFor('country') ? 'true' : null"
                [attr.aria-describedby]="errorFor('country') ? 'address-country-error' : null"
              />
            </app-field>
          </div>
          <app-field label="Address line 1" controlId="address-line1" [error]="errorFor('line1')" required>
            <input
              id="address-line1"
              type="text"
              formControlName="line1"
              autocomplete="address-line1"
              [attr.aria-invalid]="errorFor('line1') ? 'true' : null"
              [attr.aria-describedby]="errorFor('line1') ? 'address-line1-error' : null"
            />
          </app-field>
          <app-field label="Address line 2" controlId="address-line2">
            <input
              id="address-line2"
              type="text"
              formControlName="line2"
              autocomplete="address-line2"
            />
          </app-field>
          <div class="form-grid">
            <app-field label="City" controlId="address-city" [error]="errorFor('city')" required>
              <input
                id="address-city"
                type="text"
                formControlName="city"
                autocomplete="address-level2"
                [attr.aria-invalid]="errorFor('city') ? 'true' : null"
                [attr.aria-describedby]="errorFor('city') ? 'address-city-error' : null"
              />
            </app-field>
            <app-field label="State" controlId="address-state">
              <input
                id="address-state"
                type="text"
                formControlName="state"
                autocomplete="address-level1"
              />
            </app-field>
            <app-field
              label="Postal code"
              controlId="address-postal"
              [error]="errorFor('postal_code')"
              required
            >
              <input
                id="address-postal"
                type="text"
                formControlName="postal_code"
                autocomplete="postal-code"
                [attr.aria-invalid]="errorFor('postal_code') ? 'true' : null"
                [attr.aria-describedby]="errorFor('postal_code') ? 'address-postal-error' : null"
              />
            </app-field>
          </div>
          <label class="checkbox" for="address-default">
            <input id="address-default" type="checkbox" formControlName="is_default" />
            <span>Set as my default {{ form.controls.type.value }} address</span>
          </label>
          <div class="form-actions">
            <app-button type="submit" variant="primary" [loading]="saving()">Save address</app-button>
            <app-button variant="secondary" (click)="cancel()">Cancel</app-button>
          </div>
        </form>
      </app-card>
    }

    @if (loading()) {
      <app-card>
        <app-skeleton height="20px" width="50%" />
        <div class="skeleton-gap"></div>
        <app-skeleton height="20px" width="70%" />
      </app-card>
    } @else if (addresses().length === 0) {
      @if (!editing()) {
        <app-empty-state
          icon="📍"
          message="You have no saved addresses yet."
          actionLabel="Add your first address"
          (action)="startCreate()"
        />
      }
    } @else {
      <ul class="address-list">
        @for (address of addresses(); track address.id) {
          <li class="address" [attr.data-address-id]="address.id">
            <div class="address__body">
              <p class="address__type">
                {{ address.type === 'shipping' ? 'Shipping' : 'Billing' }}
                @if (address.is_default) {
                  <span class="badge">Default</span>
                }
              </p>
              <p class="address__lines">
                {{ address.line1 }}@if (address.line2) {, {{ address.line2 }}}<br />
                {{ address.city }}@if (address.state) {, {{ address.state }}} {{ address.postal_code }}<br />
                {{ address.country }}
              </p>
            </div>
            <div class="address__actions">
              <app-button variant="ghost" (click)="startEdit(address)">Edit</app-button>
              @if (!address.is_default) {
                <app-button variant="ghost" (click)="setDefault(address)">Set default</app-button>
              }
              <app-button variant="ghost" (click)="remove(address)">Delete</app-button>
            </div>
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      .addresses__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        margin-bottom: var(--space-6);
      }
      .page-title {
        margin: 0;
        font-size: var(--font-size-24);
      }
      app-card {
        display: block;
        margin-bottom: var(--space-6);
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-4);
      }
      .form-actions {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
      }
      .checkbox {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin-bottom: var(--space-4);
        font-size: var(--font-size-14);
      }
      input,
      select {
        height: 44px;
        width: 100%;
        padding: 0 var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-field);
        background: var(--color-surface);
        font: inherit;
        color: var(--color-text);
      }
      input[type='checkbox'] {
        height: auto;
        width: auto;
      }
      input:focus,
      select:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-soft);
        outline: none;
      }
      .skeleton-gap {
        height: var(--space-3);
      }
      .address-list {
        list-style: none;
        margin: 0;
        padding: 0;
        background: var(--color-surface);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-resting);
      }
      .address {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        padding: var(--space-4) var(--space-6);
        border-bottom: 1px solid var(--color-border);
      }
      .address:last-child {
        border-bottom: 0;
      }
      .address__type {
        margin: 0 0 var(--space-1);
        font-weight: 600;
      }
      .address__lines {
        margin: 0;
        color: var(--color-text-muted);
        font-size: var(--font-size-14);
        line-height: var(--line-height-body);
      }
      .address__actions {
        display: flex;
        gap: var(--space-1);
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .badge {
        margin-left: var(--space-2);
        padding: 2px var(--space-2);
        border-radius: var(--radius-pill);
        background: var(--color-primary-soft);
        color: var(--color-primary);
        font-size: var(--font-size-12);
        font-weight: 600;
      }
      @media (max-width: 767px) {
        .form-grid {
          grid-template-columns: minmax(0, 1fr);
          gap: 0;
        }
        .address {
          flex-direction: column;
          padding: var(--space-4);
        }
        .address__actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class AddressesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly addresses = signal<Address[]>([]);
  readonly editing = signal(false);
  readonly editingId = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    type: ['shipping' as 'shipping' | 'billing'],
    line1: ['', [Validators.required, Validators.maxLength(255)]],
    line2: ['', [Validators.maxLength(255)]],
    city: ['', [Validators.required, Validators.maxLength(120)]],
    state: ['', [Validators.maxLength(120)]],
    postal_code: ['', [Validators.required, Validators.maxLength(30)]],
    country: ['United States', [Validators.required, Validators.maxLength(80)]],
    is_default: [false],
  });

  ngOnInit(): void {
    this.load();
  }

  errorFor(control: AddressField): string | null {
    const field = this.form.controls[control];
    if (!field.touched || field.valid) {
      return null;
    }
    switch (control) {
      case 'line1':
        return 'Enter the street address';
      case 'city':
        return 'Enter the city';
      case 'postal_code':
        return 'Enter the postal code';
      default:
        return 'Enter the country';
    }
  }

  startCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      type: 'shipping',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'United States',
      is_default: false,
    });
    this.editing.set(true);
  }

  startEdit(address: Address): void {
    this.editingId.set(address.id ?? null);
    this.form.reset({
      type: address.type,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      state: address.state ?? '',
      postal_code: address.postal_code,
      country: address.country,
      is_default: address.is_default ?? false,
    });
    this.editing.set(true);
  }

  cancel(): void {
    this.editing.set(false);
    this.editingId.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body = {
      type: value.type,
      line1: value.line1,
      line2: value.line2 || null,
      city: value.city,
      state: value.state || null,
      postal_code: value.postal_code,
      country: value.country,
      is_default: value.is_default,
    };
    const id = this.editingId();
    this.saving.set(true);
    const request = id
      ? this.api.put<Address>(`users/me/addresses/${id}`, body)
      : this.api.post<Address>('users/me/addresses', body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.editingId.set(null);
        this.toast.success(id ? 'Address updated' : 'Address added');
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  setDefault(address: Address): void {
    if (address.id === undefined) {
      return;
    }
    this.api
      .put<Address>(`users/me/addresses/${address.id}`, {
        type: address.type,
        line1: address.line1,
        line2: address.line2 ?? null,
        city: address.city,
        state: address.state ?? null,
        postal_code: address.postal_code,
        country: address.country,
        is_default: true,
      })
      .subscribe({
        next: () => {
          this.toast.success('Default address updated');
          this.load();
        },
      });
  }

  remove(address: Address): void {
    if (address.id === undefined) {
      return;
    }
    this.api.delete<void>(`users/me/addresses/${address.id}`).subscribe({
      next: () => {
        this.toast.success('Address deleted');
        this.load();
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.get<{ data: Address[] }>('users/me/addresses').subscribe({
      next: (response) => {
        this.addresses.set(response.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
