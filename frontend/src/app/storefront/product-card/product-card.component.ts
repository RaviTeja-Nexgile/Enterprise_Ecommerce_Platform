import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MoneyPipe } from '../../core/format/money.pipe';
import { ProductSummary } from '../../core/models/catalog.model';

/**
 * A storefront product card: image, brand, name and price. Clicking it opens
 * the product's detail page (requirement 3.4).
 */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="product-card" [routerLink]="['/products', product().slug]">
      <div class="product-card__media">
        <img
          class="product-card__image"
          [src]="product().image_url || fallbackImage"
          [alt]="product().name"
          loading="lazy"
        />
        @if (product().discount_percentage > 0) {
          <span class="product-card__badge">-{{ product().discount_percentage }}%</span>
        }
      </div>
      <div class="product-card__body">
        @if (product().brand) {
          <p class="product-card__brand">{{ product().brand }}</p>
        }
        <h3 class="product-card__name">{{ product().name }}</h3>
        <div class="product-card__price">
          <span class="product-card__price-now">{{ displayPrice() | money }}</span>
          @if (product().discounted_price_cents) {
            <span class="product-card__price-was">{{ product().regular_price_cents | money }}</span>
          }
        </div>
      </div>
    </a>
  `,
  styles: [
    `
      .product-card {
        display: block;
        background: var(--color-surface);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-resting);
        overflow: hidden;
        text-decoration: none;
        color: var(--color-text);
        transition:
          box-shadow 160ms ease,
          transform 160ms ease;
      }
      .product-card:hover {
        box-shadow: var(--elevation-hover);
        transform: translateY(-2px);
      }
      .product-card__media {
        position: relative;
        aspect-ratio: 4 / 3;
        background: var(--color-bg);
      }
      .product-card__image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .product-card__badge {
        position: absolute;
        top: var(--space-2);
        left: var(--space-2);
        background: var(--color-primary);
        color: #ffffff;
        font-size: var(--font-size-12);
        font-weight: 600;
        padding: 2px var(--space-2);
        border-radius: var(--radius-pill);
      }
      .product-card__body {
        padding: var(--space-3) var(--space-4) var(--space-4);
      }
      .product-card__brand {
        margin: 0 0 2px;
        font-size: var(--font-size-12);
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .product-card__name {
        margin: 0 0 var(--space-2);
        font-size: var(--font-size-16);
        font-weight: 600;
        line-height: var(--line-height-heading);
      }
      .product-card__price {
        display: flex;
        align-items: baseline;
        gap: var(--space-2);
      }
      .product-card__price-now {
        font-size: var(--font-size-16);
        font-weight: 600;
        color: var(--color-text);
      }
      .product-card__price-was {
        font-size: var(--font-size-14);
        color: var(--color-text-muted);
        text-decoration: line-through;
      }
    `,
  ],
})
export class ProductCardComponent {
  readonly product = input.required<ProductSummary>();

  /** The price to show: the discounted price when present, else the regular price. */
  readonly displayPrice = computed(() =>
    this.product().discounted_price_cents ?? this.product().regular_price_cents,
  );

  readonly fallbackImage =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#f7f8fa"/><text x="200" y="155" font-family="sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle">No image</text></svg>',
    );
}