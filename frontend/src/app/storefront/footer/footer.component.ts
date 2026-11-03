import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The storefront footer: a four-column layout with the brand, shop links,
 * account links and a note. Part of the home page (requirement 3.1).
 */
@Component({
  selector: 'app-storefront-footer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="storefront-footer">
      <div class="container storefront-footer__grid">
        <div class="storefront-footer__col">
          <p class="storefront-footer__brand">E-Commerce Platform</p>
          <p class="storefront-footer__note">A local storefront and admin dashboard.</p>
        </div>
        <nav class="storefront-footer__col" aria-label="Shop">
          <h3 class="storefront-footer__heading">Shop</h3>
          <a routerLink="/products">All products</a>
          <a routerLink="/products" [queryParams]="{ category: 'electronics' }">Electronics</a>
          <a routerLink="/products" [queryParams]="{ category: 'home-kitchen' }">Home & Kitchen</a>
        </nav>
        <nav class="storefront-footer__col" aria-label="Account">
          <h3 class="storefront-footer__heading">Account</h3>
          <a routerLink="/account">My account</a>
          <a routerLink="/wishlist">Wishlist</a>
          <a routerLink="/cart">Cart</a>
        </nav>
        <div class="storefront-footer__col">
          <h3 class="storefront-footer__heading">About</h3>
          <p class="storefront-footer__note">Runs locally. No cloud services.</p>
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      .storefront-footer {
        background: var(--color-surface);
        border-top: 1px solid var(--color-border);
        padding: var(--space-8) 0;
        margin-top: var(--space-12);
      }
      .storefront-footer__grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--space-6);
      }
      .storefront-footer__col {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .storefront-footer__brand {
        margin: 0;
        font-weight: 600;
        color: var(--color-text);
      }
      .storefront-footer__heading {
        margin: 0 0 var(--space-2);
        font-size: var(--font-size-14);
        color: var(--color-text);
      }
      .storefront-footer__col a {
        color: var(--color-text-muted);
        text-decoration: none;
        font-size: var(--font-size-14);
      }
      .storefront-footer__col a:hover {
        color: var(--color-primary);
      }
      .storefront-footer__note {
        margin: 0;
        color: var(--color-text-muted);
        font-size: var(--font-size-14);
      }
      @media (max-width: 767px) {
        .storefront-footer__grid {
          grid-template-columns: 1fr 1fr;
        }
      }
    `,
  ],
})
export class StorefrontFooterComponent {}