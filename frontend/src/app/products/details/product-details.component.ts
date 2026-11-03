import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiClient } from '../../core/api/api-client.service';
import { ProductDetail } from '../../core/models/catalog.model';
import { ReviewFormComponent } from '../reviews/review-form/review-form.component';

/**
 * The product details page (`/products/:slug`).
 *
 * Task 5.1 builds the gallery, buy box and related products; this task adds the
 * review form for signed-in Customers (requirement 10).
 */
@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [ReviewFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="product-details">
      @if (product(); as item) {
        <h1 class="product-details__name">{{ item.name }}</h1>
        <p class="product-details__sku">SKU {{ item.sku }}</p>
        @if (item.short_description) {
          <p class="product-details__summary">{{ item.short_description }}</p>
        }
      } @else if (loading()) {
        <p class="product-details__loading" role="status">Loading product…</p>
      } @else if (error()) {
        <p class="product-details__error" role="alert">{{ error() }}</p>
      }

      @if (productId(); as id) {
        <app-review-form [productId]="id" />
      }
    </section>
  `,
  styles: [
    `
      .product-details {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        max-width: 960px;
        margin: var(--space-6) auto;
        padding: 0 var(--space-4);
      }
      .product-details__name {
        margin: 0;
        font-size: var(--font-size-32);
      }
      .product-details__sku,
      .product-details__summary {
        margin: 0;
        color: var(--color-text-muted);
      }
      .product-details__error {
        color: var(--color-error);
      }
    `,
  ],
})
export class ProductDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiClient);

  readonly product = signal<ProductDetail | null>(null);
  readonly productId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.loading.set(false);
      this.error.set('The requested product was not found');
      return;
    }
    this.api.get<ProductDetail>(`products/${encodeURIComponent(slug)}`).subscribe({
      next: (product) => {
        this.product.set(product);
        this.productId.set(product.id);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('The requested product was not found');
      },
    });
  }
}
