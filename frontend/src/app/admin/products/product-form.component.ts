import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { apiErrorMessage, readApiError } from '../../core/api/api-error';
import { MoneyPipe } from '../../core/format/money.pipe';
import { Brand, Category, ProductImage, ProductVariant } from '../../core/models/catalog.model';
import { ButtonComponent } from '../../shared/button/button.component';
import { CardComponent } from '../../shared/card/card.component';
import { FieldComponent } from '../../shared/field/field.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { ToastService } from '../../shared/toast/toast.service';
import {
  AdminProduct,
  AdminProductPayload,
  DUPLICATE_SKU_MESSAGE,
  INVALID_IMAGE_MESSAGE,
  isAcceptedImage,
} from './admin-product.model';
import { AdminProductsService, flattenCategories } from './admin-products.service';

/**
 * The create and edit product form: name, SKU, category, brand, regular price,
 * description, images, variants and publish/unpublish (requirements 12.2 to
 * 12.8).
 *
 * A missing field shows an error beside it (12.4), a SKU another product or
 * variant uses keeps the form open with "This SKU is already in use" (12.3),
 * and an image that is not a JPEG or PNG of 5 MB or less is refused with
 * "Images must be JPEG or PNG and 5 MB or less" (12.6).
 */
@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    CardComponent,
    FieldComponent,
    SkeletonComponent,
    MoneyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <h1 class="page__title">{{ isEdit() ? 'Edit product' : 'New product' }}</h1>
          <p class="page__subtitle">
            {{ isEdit() ? 'Update the product and its variants.' : 'Add a product to the catalog.' }}
          </p>
        </div>
        <a class="page__back" routerLink="/admin/products">Back to products</a>
      </header>

      @if (loading()) {
        <app-skeleton height="320px" />
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <app-card title="Details">
            <app-field label="Name" controlId="product-name" [error]="errorFor('name')" required>
              <input
                id="product-name"
                type="text"
                formControlName="name"
                [attr.aria-invalid]="errorFor('name') ? 'true' : null"
                [attr.aria-describedby]="errorFor('name') ? 'product-name-error' : null"
              />
            </app-field>

            <app-field label="SKU" controlId="product-sku" [error]="errorFor('sku')" required>
              <input
                id="product-sku"
                type="text"
                formControlName="sku"
                [attr.aria-invalid]="errorFor('sku') ? 'true' : null"
                [attr.aria-describedby]="errorFor('sku') ? 'product-sku-error' : null"
              />
            </app-field>

            <app-field
              label="Category"
              controlId="product-category"
              [error]="errorFor('category_id')"
              required
            >
              <select
                id="product-category"
                formControlName="category_id"
                [attr.aria-invalid]="errorFor('category_id') ? 'true' : null"
                [attr.aria-describedby]="errorFor('category_id') ? 'product-category-error' : null"
              >
                <option value="">Choose a category</option>
                @for (row of categories(); track row.category.id) {
                  <option [value]="row.category.id">{{ indent(row.depth) }}{{ row.category.name }}</option>
                }
              </select>
            </app-field>

            <app-field label="Brand" controlId="product-brand" [error]="errorFor('brand_id')">
              <select id="product-brand" formControlName="brand_id">
                <option value="">No brand</option>
                @for (item of brands(); track item.id) {
                  <option [value]="item.id">{{ item.name }}</option>
                }
              </select>
            </app-field>

            <app-field
              label="Regular price (USD)"
              controlId="product-price"
              [error]="errorFor('regular_price')"
              hint="For example 129.99"
              required
            >
              <input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                formControlName="regular_price"
                [attr.aria-invalid]="errorFor('regular_price') ? 'true' : null"
                [attr.aria-describedby]="errorFor('regular_price') ? 'product-price-error' : null"
              />
            </app-field>

            <app-field label="Description" controlId="product-description">
              <textarea id="product-description" rows="5" formControlName="description"></textarea>
            </app-field>

            @if (formError()) {
              <p class="text-error" role="alert">{{ formError() }}</p>
            }

            <div class="actions">
              <app-button type="submit" variant="primary" [loading]="saving()">
                {{ isEdit() ? 'Save product' : 'Create product' }}
              </app-button>
              @if (isEdit()) {
                <app-button
                  variant="secondary"
                  [disabled]="saving()"
                  (click)="togglePublish()"
                >
                  {{ product()?.status === 'published' ? 'Unpublish' : 'Publish' }}
                </app-button>
              }
            </div>
          </app-card>
        </form>

        @if (isEdit()) {
          <app-card title="Images">
            <p class="hint">JPEG or PNG, 5 MB or less.</p>
            <div class="upload">
              <label class="upload__label" for="product-image">Add an image</label>
              <input
                id="product-image"
                type="file"
                accept="image/jpeg,image/png"
                (change)="onImageSelected($event)"
              />
            </div>
            @if (imageError()) {
              <p class="text-error" role="alert">{{ imageError() }}</p>
            }
            @if (images().length > 0) {
              <ul class="gallery" aria-label="Product images">
                @for (image of images(); track image.id) {
                  <li class="gallery__item">
                    <img [src]="image.url" [alt]="image.alt_text || 'Product image'" />
                    <button
                      type="button"
                      class="gallery__remove"
                      [attr.aria-label]="'Remove image ' + image.id"
                      (click)="removeImage(image)"
                    >
                      Remove
                    </button>
                  </li>
                }
              </ul>
            } @else {
              <p class="hint">No images yet.</p>
            }
          </app-card>

          <app-card title="Variants">
            <p class="hint">Each variant has its own SKU, price and stock.</p>
            @if (variants().length > 0) {
              <ul class="variants" aria-label="Product variants">
                @for (variant of variants(); track variant.id) {
                  <li class="variants__item">
                    <span class="variants__name">{{ variant.name }}</span>
                    <span class="variants__sku">{{ variant.sku }}</span>
                    <span>{{ variant.price_cents | money }}</span>
                    <span>Stock {{ variant.available_quantity ?? 0 }}</span>
                  </li>
                }
              </ul>
            }
            <form [formGroup]="variantForm" (ngSubmit)="addVariant()" novalidate class="variant-form">
              <app-field label="Variant name" controlId="variant-name" [error]="variantErrorFor('name')">
                <input id="variant-name" type="text" formControlName="name" />
              </app-field>
              <app-field label="Variant SKU" controlId="variant-sku" [error]="variantErrorFor('sku')">
                <input id="variant-sku" type="text" formControlName="sku" />
              </app-field>
              <app-field label="Variant price (USD)" controlId="variant-price" [error]="variantErrorFor('price')">
                <input id="variant-price" type="number" min="0" step="0.01" formControlName="price" />
              </app-field>
              <app-field label="Variant stock" controlId="variant-stock" [error]="variantErrorFor('stock')">
                <input id="variant-stock" type="number" min="0" step="1" formControlName="stock" />
              </app-field>
              <app-button type="submit" variant="secondary" [loading]="savingVariant()">
                Add variant
              </app-button>
            </form>
            @if (variantFormError()) {
              <p class="text-error" role="alert">{{ variantFormError() }}</p>
            }
          </app-card>
        }
      }
    </div>
  `,
  styles: [
    `
      .page {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        max-width: 880px;
      }
      .page__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        flex-wrap: wrap;
      }
      .page__title {
        margin: 0;
        font-size: var(--font-size-24);
      }
      .page__subtitle {
        margin: var(--space-1) 0 0;
        color: var(--color-text-muted);
        font-size: var(--font-size-14);
      }
      .page__back {
        color: var(--color-primary);
        font-weight: 600;
        text-decoration: none;
      }
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
      .hint {
        margin: 0 0 var(--space-3);
        color: var(--color-text-muted);
        font-size: var(--font-size-14);
      }
      .upload {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        margin-bottom: var(--space-3);
      }
      .upload__label {
        font-size: var(--font-size-14);
        font-weight: 600;
      }
      .gallery {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3);
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .gallery__item {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        width: 140px;
      }
      .gallery__item img {
        width: 140px;
        height: 105px;
        object-fit: cover;
        border-radius: var(--radius-field);
        border: 1px solid var(--color-border);
      }
      .gallery__remove {
        border: 0;
        background: transparent;
        color: var(--color-error);
        font-weight: 600;
        cursor: pointer;
        padding: 0;
        text-align: left;
      }
      .variants {
        list-style: none;
        padding: 0;
        margin: 0 0 var(--space-4);
      }
      .variants__item {
        display: flex;
        gap: var(--space-4);
        flex-wrap: wrap;
        padding: var(--space-3) 0;
        border-bottom: 1px solid var(--color-border);
        font-size: var(--font-size-14);
      }
      .variants__name {
        font-weight: 600;
      }
      .variants__sku {
        color: var(--color-text-muted);
      }
      .variant-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: var(--space-3);
        align-items: start;
      }
    `,
  ],
})
export class ProductFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminProductsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly savingVariant = signal(false);
  readonly formError = signal<string | null>(null);
  readonly imageError = signal<string | null>(null);
  readonly variantFormError = signal<string | null>(null);
  readonly product = signal<AdminProduct | null>(null);
  readonly images = signal<ProductImage[]>([]);
  readonly variants = signal<ProductVariant[]>([]);
  readonly categories = signal<{ category: Category; depth: number }[]>([]);
  readonly brands = signal<Brand[]>([]);
  readonly isEdit = signal(false);

  private productId: number | null = null;
  private submitted = false;

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
    sku: ['', [Validators.required]],
    category_id: ['', [Validators.required]],
    brand_id: [''],
    regular_price: ['', [Validators.required]],
    description: [''],
  });

  readonly variantForm = this.fb.group({
    name: ['', [Validators.required]],
    sku: ['', [Validators.required]],
    price: ['', [Validators.required]],
    stock: ['0', [Validators.required]],
  });

  ngOnInit(): void {
    this.service.categories().subscribe({
      next: (answer) => this.categories.set(flattenCategories(answer.data ?? [])),
      error: () => this.categories.set([]),
    });
    this.service.brands().subscribe({
      next: (answer) => this.brands.set(answer.data ?? []),
      error: () => this.brands.set([]),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productId = Number(id);
      this.isEdit.set(true);
      this.loadProduct(this.productId);
    }
  }

  indent(depth: number): string {
    return depth > 0 ? `${'— '.repeat(depth)}` : '';
  }

  /** The error beside a field, shown once the form was submitted or the field touched. */
  errorFor(control: 'name' | 'sku' | 'category_id' | 'brand_id' | 'regular_price'): string | null {
    const field = this.form.controls[control];
    if (!field || field.valid) {
      return null;
    }
    if (!this.submitted && !field.touched) {
      return null;
    }
    switch (control) {
      case 'name':
        return 'Enter a product name';
      case 'sku':
        return 'Enter a SKU';
      case 'category_id':
        return 'Choose a category';
      case 'regular_price':
        return 'Enter a regular price';
      default:
        return null;
    }
  }

  variantErrorFor(control: 'name' | 'sku' | 'price' | 'stock'): string | null {
    const field = this.variantForm.controls[control];
    if (!field || field.valid || !field.touched) {
      return null;
    }
    switch (control) {
      case 'name':
        return 'Enter a variant name';
      case 'sku':
        return 'Enter a variant SKU';
      case 'price':
        return 'Enter a variant price';
      default:
        return 'Enter the stock';
    }
  }

  submit(): void {
    this.submitted = true;
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.buildPayload();
    this.saving.set(true);
    const request = this.productId
      ? this.service.update(this.productId, payload)
      : this.service.create(payload);
    request.subscribe({
      next: (product) => {
        this.saving.set(false);
        this.toast.success(this.productId ? 'Product saved' : 'Product created');
        if (!this.productId) {
          this.productId = product.id;
          this.isEdit.set(true);
          this.product.set(product);
          this.images.set(product.images ?? []);
          this.variants.set(product.variants ?? []);
          void this.router.navigate(['/admin/products', product.id], { replaceUrl: true });
        } else {
          this.product.set(product);
          this.images.set(product.images ?? []);
          this.variants.set(product.variants ?? []);
        }
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.applyApiError(error);
      },
    });
  }

  togglePublish(): void {
    if (!this.productId) {
      return;
    }
    const next = this.product()?.status === 'published' ? 'draft' : 'published';
    this.saving.set(true);
    this.service.update(this.productId, { status: next }).subscribe({
      next: (product) => {
        this.saving.set(false);
        this.product.set(product);
        this.toast.success(next === 'published' ? 'Product published' : 'Product unpublished');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.toast.error(apiErrorMessage(error));
      },
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.imageError.set(null);
    if (!isAcceptedImage(file)) {
      this.imageError.set(INVALID_IMAGE_MESSAGE);
      return;
    }
    if (!this.productId) {
      return;
    }
    this.service.uploadImage(this.productId, file).subscribe({
      next: (image) => {
        this.images.update((images) => [...images, image]);
        this.toast.success('Image added');
      },
      error: (error: unknown) => {
        const body = readApiError(error);
        this.imageError.set(body.code === 'invalid_image' ? INVALID_IMAGE_MESSAGE : body.message);
      },
    });
  }

  removeImage(image: ProductImage): void {
    if (!this.productId) {
      return;
    }
    this.service.deleteImage(this.productId, image.id).subscribe({
      next: () => {
        this.images.update((images) => images.filter((item) => item.id !== image.id));
        this.toast.success('Image removed');
      },
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
  }

  addVariant(): void {
    this.variantFormError.set(null);
    if (this.variantForm.invalid) {
      this.variantForm.markAllAsTouched();
      return;
    }
    if (!this.productId) {
      return;
    }
    const value = this.variantForm.getRawValue();
    this.savingVariant.set(true);
    this.service
      .addVariant(this.productId, {
        name: String(value.name ?? '').trim(),
        sku: String(value.sku ?? '').trim(),
        price_cents: this.toCents(value.price),
        stock: Number(value.stock ?? 0),
      })
      .subscribe({
        next: (variant) => {
          this.savingVariant.set(false);
          this.variants.update((variants) => [...variants, variant]);
          this.variantForm.reset({ name: '', sku: '', price: '', stock: '0' });
          this.toast.success('Variant added');
        },
        error: (error: unknown) => {
          this.savingVariant.set(false);
          const body = readApiError(error);
          this.variantFormError.set(
            body.code === 'duplicate_sku' ? DUPLICATE_SKU_MESSAGE : body.message,
          );
        },
      });
  }

  private loadProduct(id: number): void {
    this.loading.set(true);
    this.service.get(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.images.set(product.images ?? []);
        this.variants.set(product.variants ?? []);
        this.form.patchValue({
          name: product.name,
          sku: product.sku,
          category_id: product.category_id ? String(product.category_id) : '',
          brand_id: product.brand_id ? String(product.brand_id) : '',
          regular_price: (product.regular_price_cents / 100).toFixed(2),
          description: product.description ?? '',
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private buildPayload(): AdminProductPayload {
    const value = this.form.getRawValue();
    return {
      name: String(value.name ?? '').trim(),
      sku: String(value.sku ?? '').trim(),
      category_id: Number(value.category_id),
      brand_id: value.brand_id ? Number(value.brand_id) : null,
      regular_price_cents: this.toCents(value.regular_price),
      description: String(value.description ?? '').trim() || null,
    };
  }

  /** Show the API's field errors beside their fields, or its message above the form. */
  private applyApiError(error: unknown): void {
    const body = readApiError(error);
    if (body.code === 'duplicate_sku') {
      this.formError.set(DUPLICATE_SKU_MESSAGE);
      return;
    }
    const fields = body.fields ?? {};
    let matched = false;
    for (const [field, message] of Object.entries(fields)) {
      const control = this.form.get(field);
      if (control) {
        control.setErrors({ server: message });
        matched = true;
      }
    }
    this.formError.set(matched ? null : body.message);
  }

  private toCents(value: unknown): number {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      return 0;
    }
    return Math.round(amount * 100);
  }
}
