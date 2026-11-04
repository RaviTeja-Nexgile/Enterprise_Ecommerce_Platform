import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { apiErrorMessage } from '../../core/api/api-error';
import { ApiClient } from '../../core/api/api-client.service';
import { AuthService } from '../../core/auth/auth.service';
import { MoneyPipe } from '../../core/format/money.pipe';
import {
  ProductDetail,
  ProductSummary,
  ProductVariant,
} from '../../core/models/catalog.model';
import { ButtonComponent } from '../../shared/button/button.component';
import { ToastService } from '../../shared/toast/toast.service';
import { ProductCardComponent } from '../../storefront/product-card/product-card.component';
import { ProductGalleryComponent } from '../gallery/product-gallery.component';
import { ReviewFormComponent } from '../reviews/review-form/review-form.component';
import { ReviewListComponent } from '../reviews/review-list/review-list.component';

/** The message of requirement 5.5, shown when nothing is in stock. */
export const OUT_OF_STOCK_MESSAGE = 'Out of stock';
/** The key recently viewed products are kept under in local storage (requirement 5.8). */
export const RECENTLY_VIEWED_KEY = 'recently_viewed_products';
/** At most this many recently viewed products are kept (requirement 5.8). */
export const RECENTLY_VIEWED_LIMIT = 6;

/**
 * The product details page (`/products/:slug`), requirements 5.1 to 5.8.
 *
 * Loads `GET /api/v1/products/{id_or_slug}` and shows the gallery, the buy box
 * (name, SKU, prices, stock, variants, quantity, Add to cart, Add to wishlist),
 * the description and specifications, the rating summary and approved reviews,
 * the related products and the recently viewed products kept in local storage.
 */
@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [
    MoneyPipe,
    ButtonComponent,
    ProductGalleryComponent,
    ReviewListComponent,
    ReviewFormComponent,
    ProductCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="product-details">
      @if (product(); as item) {
        <div class="product-details__top">
          <app-product-gallery [images]="item.images" [productName]="item.name" />

          <div class="product-details__buy">
            <h1 class="product-details__name">{{ item.name }}</h1>

            <div class="product-details__rating">
              <span class="product-details__stars" [attr.aria-label]="ratingAverage() + ' out of 5 stars'">
                {{ stars(ratingAverage()) }}
              </span>
              <span class="product-details__rating-count">{{ ratingCount() }} reviews</span>
            </div>

            <p class="product-details__sku">SKU <span class="product-details__sku-value">{{ currentSku() }}</span></p>

            <div class="product-details__price">
              <span class="product-details__price-now">{{ currentPrice() | money }}</span>
              @if (discountPercentage() > 0) {
                <span class="product-details__price-was">{{ item.regular_price_cents | money }}</span>
                <span class="product-details__discount">-{{ discountPercentage() }}%</span>
              }
            </div>

            <p
              class="product-details__stock"
              [class.product-details__stock--out]="!inStock()"
              role="status"
            >
              @if (inStock()) {
                In stock ({{ availableQuantity() }} available)
              } @else {
                {{ outOfStockMessage }}
              }
            </p>

            @if (item.variants.length > 0) {
              <fieldset class="product-details__variants">
                <legend class="product-details__legend">Options</legend>
                <div class="product-details__chips">
                  @for (variant of item.variants; track variant.id) {
                    <button
                      type="button"
                      class="product-details__chip"
                      [class.product-details__chip--active]="variant.id === selectedVariantId()"
                      [attr.aria-pressed]="variant.id === selectedVariantId()"
                      (click)="selectVariant(variant)"
                    >
                      {{ variant.name }}
                    </button>
                  }
                </div>
              </fieldset>
            }

            <div class="product-details__quantity">
              <label class="product-details__quantity-label" for="quantity">Quantity</label>
              <div class="product-details__stepper">
                <button
                  type="button"
                  class="product-details__step"
                  aria-label="Decrease quantity"
                  [disabled]="quantity() <= 1"
                  (click)="decreaseQuantity()"
                >
                  −
                </button>
                <input
                  id="quantity"
                  class="product-details__quantity-input"
                  type="number"
                  min="1"
                  [max]="availableQuantity() || 1"
                  [value]="quantity()"
                  (input)="onQuantityInput($event)"
                />
                <button
                  type="button"
                  class="product-details__step"
                  aria-label="Increase quantity"
                  [disabled]="quantity() >= availableQuantity()"
                  (click)="increaseQuantity()"
                >
                  +
                </button>
              </div>
            </div>

            <div class="product-details__actions">
              <app-button
                variant="primary"
                [disabled]="!inStock()"
                [loading]="addingToCart()"
                (click)="addToCart()"
              >
                Add to cart
              </app-button>
              <app-button variant="secondary" (click)="addToWishlist()">
                Add to wishlist
              </app-button>
            </div>

            @if (actionError()) {
              <p class="product-details__error" role="alert">{{ actionError() }}</p>
            }
          </div>
        </div>

        <div class="product-details__info">
          <section class="product-details__section" aria-labelledby="description-heading">
            <h2 id="description-heading" class="product-details__section-heading">Description</h2>
            <p class="product-details__description">{{ item.description || item.short_description || 'No description.' }}</p>
          </section>

          @if (item.attributes && item.attributes.length > 0) {
            <section class="product-details__section" aria-labelledby="specs-heading">
              <h2 id="specs-heading" class="product-details__section-heading">Specifications</h2>
              <dl class="product-details__specs">
                @for (attribute of item.attributes; track attribute.name) {
                  <div class="product-details__spec">
                    <dt>{{ attribute.name }}</dt>
                    <dd>{{ attribute.values.join(', ') }}</dd>
                  </div>
                }
              </dl>
            </section>
          }
        </div>

        <app-review-list [reviews]="item.reviews ?? []" [summary]="item.rating_summary ?? null" />

        <app-review-form [productId]="item.id" />

        @if (item.related && item.related.length > 0) {
          <section class="product-details__section" aria-labelledby="related-heading">
            <h2 id="related-heading" class="product-details__section-heading">Related products</h2>
            <div class="product-details__grid">
              @for (related of item.related; track related.id) {
                <app-product-card [product]="related" />
              }
            </div>
          </section>
        }
      } @else if (loading()) {
        <p class="product-details__loading" role="status">Loading product…</p>
      } @else if (error()) {
        <p class="product-details__error" role="alert">{{ error() }}</p>
      }

      @if (recentlyViewed().length > 0) {
        <section class="product-details__section" aria-labelledby="recent-heading">
          <h2 id="recent-heading" class="product-details__section-heading">Recently viewed</h2>
          <div class="product-details__grid">
            @for (recent of recentlyViewed(); track recent.id) {
              <app-product-card [product]="recent" />
            }
          </div>
        </section>
      }
    </section>

    @if (product(); as item) {
      <div class="product-details__sticky">
        <span class="product-details__sticky-price">{{ currentPrice() | money }}</span>
        <app-button
          variant="primary"
          [disabled]="!inStock()"
          [loading]="addingToCart()"
          (click)="addToCart()"
        >
          Add to cart
        </app-button>
      </div>
    }
  `,
  styles: [
    `
      .product-details {
        display: flex;
        flex-direction: column;
        gap: var(--space-8);
        max-width: var(--content-max-width);
        margin: var(--space-6) auto;
        padding: 0 var(--space-4) var(--space-12);
      }
      .product-details__top {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: var(--space-8);
        align-items: start;
      }
      .product-details__buy {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        min-width: 0;
      }
      .product-details__name {
        margin: 0;
        font-size: var(--font-size-32);
        line-height: var(--line-height-heading);
      }
      .product-details__rating {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }
      .product-details__stars {
        color: var(--color-warning);
        letter-spacing: 2px;
      }
      .product-details__rating-count {
        font-size: var(--font-size-14);
        color: var(--color-text-muted);
      }
      .product-details__sku {
        margin: 0;
        font-size: var(--font-size-14);
        color: var(--color-text-muted);
      }
      .product-details__price {
        display: flex;
        align-items: baseline;
        gap: var(--space-2);
        flex-wrap: wrap;
      }
      .product-details__price-now {
        font-size: var(--font-size-24);
        font-weight: 600;
      }
      .product-details__price-was {
        font-size: var(--font-size-16);
        color: var(--color-text-muted);
        text-decoration: line-through;
      }
      .product-details__discount {
        font-size: var(--font-size-12);
        font-weight: 600;
        padding: 2px var(--space-2);
        border-radius: var(--radius-pill);
        background: var(--color-primary);
        color: #ffffff;
      }
      .product-details__stock {
        margin: 0;
        font-size: var(--font-size-14);
        color: var(--color-success);
      }
      .product-details__stock--out {
        color: var(--color-error);
        font-weight: 600;
      }
      .product-details__variants {
        border: 0;
        padding: 0;
        margin: 0;
      }
      .product-details__legend {
        font-size: var(--font-size-14);
        font-weight: 600;
        margin-bottom: var(--space-2);
      }
      .product-details__chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }
      .product-details__chip {
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-pill);
        background: var(--color-surface);
        color: var(--color-text);
        font: inherit;
        cursor: pointer;
      }
      .product-details__chip--active {
        border-color: var(--color-primary);
        background: var(--color-primary-soft);
        color: var(--color-primary);
        font-weight: 600;
      }
      .product-details__quantity {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }
      .product-details__quantity-label {
        font-size: var(--font-size-14);
        font-weight: 600;
      }
      .product-details__stepper {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-field);
        overflow: hidden;
      }
      .product-details__step {
        width: 40px;
        height: 40px;
        border: 0;
        background: var(--color-bg);
        font-size: var(--font-size-18);
        cursor: pointer;
      }
      .product-details__step:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .product-details__quantity-input {
        width: 56px;
        height: 40px;
        border: 0;
        border-left: 1px solid var(--color-border);
        border-right: 1px solid var(--color-border);
        text-align: center;
        font: inherit;
        -moz-appearance: textfield;
      }
      .product-details__quantity-input::-webkit-outer-spin-button,
      .product-details__quantity-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .product-details__actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3);
      }
      .product-details__info {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: var(--space-8);
      }
      .product-details__section {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .product-details__section-heading {
        margin: 0;
        font-size: var(--font-size-24);
      }
      .product-details__description {
        margin: 0;
        line-height: var(--line-height-body);
      }
      .product-details__specs {
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .product-details__spec {
        display: grid;
        grid-template-columns: 140px minmax(0, 1fr);
        gap: var(--space-3);
        padding-bottom: var(--space-2);
        border-bottom: 1px solid var(--color-border);
      }
      .product-details__spec dt {
        font-weight: 600;
        color: var(--color-text-muted);
      }
      .product-details__spec dd {
        margin: 0;
      }
      .product-details__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: var(--space-4);
      }
      .product-details__loading {
        color: var(--color-text-muted);
      }
      .product-details__error {
        color: var(--color-error);
      }
      .product-details__sticky {
        display: none;
      }
      @media (max-width: 767px) {
        .product-details__top,
        .product-details__info {
          grid-template-columns: minmax(0, 1fr);
        }
        .product-details__name {
          font-size: var(--font-size-24);
        }
        .product-details__sticky {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 900;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          box-shadow: var(--elevation-hover);
        }
        .product-details__sticky-price {
          font-size: var(--font-size-18);
          font-weight: 600;
        }
        .product-details {
          padding-bottom: 96px;
        }
      }
    `,
  ],
})
export class ProductDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly outOfStockMessage = OUT_OF_STOCK_MESSAGE;

  readonly product = signal<ProductDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly selectedVariantId = signal<number | null>(null);
  readonly quantity = signal(1);
  readonly addingToCart = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly recentlyViewed = signal<ProductSummary[]>([]);

  readonly selectedVariant = computed<ProductVariant | null>(() => {
    const item = this.product();
    const id = this.selectedVariantId();
    if (!item || id === null) {
      return null;
    }
    return item.variants.find((variant) => variant.id === id) ?? null;
  });

  readonly currentSku = computed(() => this.selectedVariant()?.sku ?? this.product()?.sku ?? '');

  readonly currentPrice = computed(() => {
    const variant = this.selectedVariant();
    if (variant) {
      return variant.price_cents;
    }
    const item = this.product();
    if (!item) {
      return 0;
    }
    return item.discounted_price_cents ?? item.regular_price_cents;
  });

  readonly discountPercentage = computed(() => {
    const item = this.product();
    if (!item || this.selectedVariant()) {
      return 0;
    }
    return item.discount_percentage;
  });

  readonly availableQuantity = computed(() => {
    const variant = this.selectedVariant();
    if (variant) {
      return variant.available_quantity ?? 0;
    }
    return this.product()?.available_quantity ?? 0;
  });

  readonly inStock = computed(() => this.availableQuantity() > 0);

  readonly ratingAverage = computed(() => {
    const item = this.product();
    return item?.rating_summary?.average ?? item?.rating_average ?? 0;
  });

  readonly ratingCount = computed(() => {
    const item = this.product();
    return item?.rating_summary?.count ?? item?.rating_count ?? 0;
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.loading.set(false);
        this.error.set('The requested product was not found');
        return;
      }
      this.load(slug);
    });
  }

  stars(rating: number): string {
    const filled = Math.max(0, Math.min(5, Math.round(rating)));
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  }

  selectVariant(variant: ProductVariant): void {
    this.selectedVariantId.set(variant.id);
    this.quantity.set(1);
  }

  increaseQuantity(): void {
    const max = this.availableQuantity();
    if (this.quantity() < max) {
      this.quantity.set(this.quantity() + 1);
    }
  }

  decreaseQuantity(): void {
    if (this.quantity() > 1) {
      this.quantity.set(this.quantity() - 1);
    }
  }

  onQuantityInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const parsed = Math.trunc(Number(input.value));
    const max = Math.max(this.availableQuantity(), 1);
    const value = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), max) : 1;
    this.quantity.set(value);
    input.value = String(value);
  }

  addToCart(): void {
    const item = this.product();
    if (!item || !this.inStock()) {
      return;
    }
    this.actionError.set(null);
    this.addingToCart.set(true);
    this.api
      .post('cart/items', {
        product_id: item.id,
        variant_id: this.selectedVariantId(),
        quantity: this.quantity(),
      })
      .subscribe({
        next: () => {
          this.addingToCart.set(false);
          this.toast.success('Added to cart');
        },
        error: (error: unknown) => {
          this.addingToCart.set(false);
          this.actionError.set(apiErrorMessage(error));
        },
      });
  }

  addToWishlist(): void {
    const item = this.product();
    if (!item) {
      return;
    }
    if (!this.auth.isSignedIn()) {
      this.router.navigate(['/sign-in']);
      return;
    }
    this.actionError.set(null);
    this.api.post('wishlist/items', { product_id: item.id }).subscribe({
      next: () => this.toast.success('Added to wishlist'),
      error: (error: unknown) => {
        const message = apiErrorMessage(error);
        if (message === 'Already in your wishlist') {
          this.toast.info(message);
        } else {
          this.actionError.set(message);
        }
      },
    });
  }

  private load(slug: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.product.set(null);
    this.selectedVariantId.set(null);
    this.quantity.set(1);
    this.api.get<ProductDetail>(`products/${encodeURIComponent(slug)}`).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);
        this.rememberViewed(product);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('The requested product was not found');
      },
    });
  }

  /** Add the product to the recently viewed list kept in local storage (5.8). */
  private rememberViewed(product: ProductDetail): void {
    const summary: ProductSummary = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      short_description: product.short_description,
      image_url: product.image_url,
      brand: product.brand,
      category: product.category,
      regular_price_cents: product.regular_price_cents,
      discounted_price_cents: product.discounted_price_cents,
      discount_percentage: product.discount_percentage,
      in_stock: product.in_stock,
      available_quantity: product.available_quantity,
      rating_average: product.rating_average,
      rating_count: product.rating_count,
      is_featured: product.is_featured,
      is_new_arrival: product.is_new_arrival,
    };
    const existing = this.readRecentlyViewed().filter((entry) => entry.id !== summary.id);
    const updated = [summary, ...existing].slice(0, RECENTLY_VIEWED_LIMIT);
    try {
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
    } catch {
      // Local storage may be unavailable; the page still works without it.
    }
    this.recentlyViewed.set(updated.filter((entry) => entry.id !== summary.id));
  }

  private readRecentlyViewed(): ProductSummary[] {
    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as ProductSummary[]) : [];
    } catch {
      return [];
    }
  }
}
