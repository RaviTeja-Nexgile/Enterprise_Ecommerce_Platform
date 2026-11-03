import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { StorefrontHome } from '../../core/models/catalog.model';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { NewsletterComponent } from '../newsletter/newsletter.component';
import { ProductCardComponent } from '../product-card/product-card.component';
import { StorefrontService } from '../storefront.service';

const SKELETON_GRID = [1, 2, 3, 4];

/**
 * The storefront home page, built from `GET /api/v1/storefront/home`
 * (requirement 3). It shows the hero banner, featured categories, trending,
 * best-selling, new arrivals, promotional offers, testimonials and the
 * newsletter form, with skeleton placeholders while the data loads.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, SkeletonComponent, ProductCardComponent, NewsletterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="home">
      @if (loading()) {
        <div class="home__skeleton" aria-hidden="true">
          <div class="hero-skeleton">
            <app-skeleton height="48px" width="60%" />
            <app-skeleton height="20px" width="80%" />
            <app-skeleton height="48px" width="200px" />
          </div>
          <section class="section">
            <app-skeleton height="24px" width="240px" />
            <div class="category-grid">
              @for (item of skeletonGrid; track item) {
                <app-skeleton height="120px" />
              }
            </div>
          </section>
          <section class="section">
            <app-skeleton height="24px" width="240px" />
            <div class="product-grid">
              @for (item of skeletonGrid; track item) {
                <app-skeleton height="280px" />
              }
            </div>
          </section>
        </div>
      } @else if (home(); as data) {
        <section class="hero">
          <div class="hero__content">
            <h1 class="hero__title">{{ data.hero.title }}</h1>
            <p class="hero__subtitle">{{ data.hero.subtitle }}</p>
            <a class="hero__cta" routerLink="/products">{{ data.hero.cta }}</a>
          </div>
          @if (data.hero.image_url) {
            <img
              class="hero__image"
              [src]="data.hero.image_url"
              [alt]="data.hero.title"
              loading="eager"
            />
          }
        </section>

        <section class="section" aria-labelledby="featured-heading">
          <h2 id="featured-heading" class="section__title">Featured categories</h2>
          <div class="category-grid">
            @for (category of data.featured_categories; track category.id) {
              <a
                class="category-tile"
                [routerLink]="['/products']"
                [queryParams]="{ category: category.slug }"
              >
                <img
                  class="category-tile__image"
                  [src]="category.image_url || fallbackImage"
                  [alt]="category.name"
                  loading="lazy"
                />
                <span class="category-tile__name">{{ category.name }}</span>
              </a>
            }
          </div>
        </section>

        <section class="section" aria-labelledby="trending-heading">
          <h2 id="trending-heading" class="section__title">Trending</h2>
          <div class="product-grid">
            @for (product of data.trending; track product.id) {
              <app-product-card [product]="product" />
            }
          </div>
        </section>

        <section class="section" aria-labelledby="best-selling-heading">
          <h2 id="best-selling-heading" class="section__title">Best selling</h2>
          <div class="product-grid">
            @for (product of data.best_selling; track product.id) {
              <app-product-card [product]="product" />
            }
          </div>
        </section>

        <section class="section" aria-labelledby="offers-heading">
          <h2 id="offers-heading" class="section__title">Special offers</h2>
          <div class="product-grid">
            @for (product of data.offers; track product.id) {
              <app-product-card [product]="product" />
            }
          </div>
        </section>

        <section class="section" aria-labelledby="new-arrivals-heading">
          <h2 id="new-arrivals-heading" class="section__title">New arrivals</h2>
          <div class="product-grid">
            @for (product of data.new_arrivals; track product.id) {
              <app-product-card [product]="product" />
            }
          </div>
        </section>

        <section class="section" aria-labelledby="testimonials-heading">
          <h2 id="testimonials-heading" class="section__title">What our customers say</h2>
          <div class="testimonial-grid">
            @for (testimonial of data.testimonials; track testimonial.name) {
              <figure class="testimonial">
                <blockquote class="testimonial__quote">“{{ testimonial.quote }}”</blockquote>
                <figcaption class="testimonial__author">
                  {{ testimonial.name }}
                  <span class="testimonial__rating" aria-label="{{ testimonial.rating }} out of 5 stars">
                    {{ '★'.repeat(testimonial.rating) }}
                  </span>
                </figcaption>
              </figure>
            }
          </div>
        </section>

        <app-newsletter />
      }
    </div>
  `,
  styles: [
    `
      .home {
        display: flex;
        flex-direction: column;
        gap: var(--space-12);
      }
      .hero {
        display: grid;
        grid-template-columns: 1fr 1fr;
        align-items: center;
        gap: var(--space-8);
        background: var(--color-surface);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-resting);
        overflow: hidden;
      }
      .hero__content {
        padding: var(--space-8);
      }
      .hero__title {
        margin: 0 0 var(--space-4);
        font-size: var(--font-size-48);
        line-height: var(--line-height-heading);
      }
      .hero__subtitle {
        margin: 0 0 var(--space-6);
        font-size: var(--font-size-18);
        color: var(--color-text-muted);
      }
      .hero__cta {
        display: inline-flex;
        align-items: center;
        min-height: 48px;
        padding: 0 var(--space-6);
        background: var(--color-primary);
        color: #ffffff;
        border-radius: var(--radius-button);
        font-weight: 600;
        text-decoration: none;
      }
      .hero__cta:hover {
        background: var(--color-primary-hover);
      }
      .hero__image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        min-height: 320px;
      }
      .section {
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
      }
      .section__title {
        margin: 0;
        font-size: var(--font-size-24);
      }
      .category-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: var(--space-4);
      }
      .category-tile {
        position: relative;
        display: flex;
        align-items: flex-end;
        min-height: 120px;
        border-radius: var(--radius-card);
        overflow: hidden;
        text-decoration: none;
        color: #ffffff;
        box-shadow: var(--elevation-resting);
      }
      .category-tile__image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .category-tile__name {
        position: relative;
        z-index: 1;
        padding: var(--space-3);
        font-weight: 600;
        background: linear-gradient(transparent, rgba(17, 24, 39, 0.7));
        width: 100%;
      }
      .product-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--space-6);
      }
      .testimonial-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-6);
      }
      .testimonial {
        margin: 0;
        background: var(--color-surface);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-resting);
        padding: var(--space-6);
      }
      .testimonial__quote {
        margin: 0 0 var(--space-4);
        font-size: var(--font-size-16);
        color: var(--color-text);
      }
      .testimonial__author {
        font-weight: 600;
        color: var(--color-text-muted);
      }
      .testimonial__rating {
        color: var(--color-warning);
        margin-left: var(--space-2);
      }
      .home__skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--space-12);
      }
      .hero-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        background: var(--color-surface);
        border-radius: var(--radius-card);
        padding: var(--space-8);
      }
      @media (max-width: 1199px) {
        .category-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        .product-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }
      @media (max-width: 767px) {
        .home {
          gap: var(--space-8);
        }
        .hero {
          grid-template-columns: 1fr;
        }
        .hero__title {
          font-size: var(--font-size-32);
        }
        .hero__image {
          min-height: 200px;
        }
        .category-grid {
          grid-template-columns: repeat(2, 1fr);
          overflow-x: auto;
        }
        .product-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-4);
        }
        .testimonial-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class HomeComponent {
  private readonly storefront = inject(StorefrontService);

  readonly loading = signal(true);
  readonly home = signal<StorefrontHome | null>(null);
  readonly skeletonGrid = SKELETON_GRID;

  readonly fallbackImage =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#f7f8fa"/><text x="200" y="155" font-family="sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle">No image</text></svg>',
    );

  constructor() {
    this.storefront.home().subscribe({
      next: (data) => {
        this.home.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}