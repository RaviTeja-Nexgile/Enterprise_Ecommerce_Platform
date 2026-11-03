import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { Category } from '../../core/models/catalog.model';
import { SearchSuggestion, StorefrontService } from '../storefront.service';

/**
 * The storefront header: logo, category mega-menu, search with autocomplete,
 * wishlist, cart icon with count badge and the account menu. Category clicks
 * open `/products?category=...` and search suggestions open the product page.
 */
@Component({
  selector: 'app-storefront-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="storefront-header">
      <div class="storefront-header__inner container">
        <a class="storefront-header__logo" routerLink="/" aria-label="E-Commerce Platform home">
          <span class="storefront-header__mark" aria-hidden="true">◆</span>
          <span class="storefront-header__name">E-Commerce Platform</span>
        </a>

        <nav class="storefront-header__nav" aria-label="Main">
          <a routerLink="/" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">
            Home
          </a>
          <div class="mega-menu">
            <button
              type="button"
              class="mega-menu__trigger"
              (click)="toggleMenu()"
              [attr.aria-expanded]="menuOpen()"
            >
              Categories
            </button>
            @if (menuOpen()) {
              <div class="mega-menu__panel">
                @for (category of categories(); track category.id) {
                  <a
                    class="mega-menu__link"
                    [routerLink]="['/products']"
                    [queryParams]="{ category: category.slug }"
                    (click)="closeMenu()"
                  >
                    {{ category.name }}
                  </a>
                }
              </div>
            }
          </div>
          <a routerLink="/products" routerLinkActive="is-active">Products</a>
        </nav>

        <div class="storefront-header__search">
          <input
            class="storefront-header__search-input"
            type="search"
            [value]="query()"
            (input)="onSearchInput($event)"
            (keydown.enter)="submitSearch()"
            placeholder="Search products"
            aria-label="Search products"
            autocomplete="off"
          />
          @if (suggestions().length) {
            <ul class="search-suggestions" role="listbox" aria-label="Search suggestions">
              @for (suggestion of suggestions(); track suggestion.id) {
                <li>
                  <button
                    type="button"
                    class="search-suggestions__item"
                    role="option"
                    (click)="goToProduct(suggestion.slug)"
                  >
                    {{ suggestion.name }}
                  </button>
                </li>
              }
            </ul>
          }
        </div>

        <div class="storefront-header__actions">
          <a routerLink="/wishlist" class="storefront-header__icon" aria-label="Wishlist">♥</a>
          <a routerLink="/cart" class="storefront-header__icon" aria-label="Cart">
            <span aria-hidden="true">🛒</span>
            @if (cartCount() > 0) {
              <span class="storefront-header__badge">{{ cartCount() }}</span>
            }
          </a>
          @if (auth.isSignedIn()) {
            <a routerLink="/account" class="storefront-header__account">Account</a>
            <button type="button" class="storefront-header__signout" (click)="signOut()">
              Sign out
            </button>
          } @else {
            <a routerLink="/sign-in" class="storefront-header__signin">Sign in</a>
          }
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      .storefront-header {
        position: sticky;
        top: 0;
        z-index: 100;
        height: var(--header-height);
        background: var(--color-surface);
        border-bottom: 1px solid var(--color-border);
      }
      .storefront-header__inner {
        display: flex;
        align-items: center;
        gap: var(--space-6);
        height: 100%;
      }
      .storefront-header__logo {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        font-weight: 600;
        color: var(--color-text);
        text-decoration: none;
        white-space: nowrap;
      }
      .storefront-header__mark {
        color: var(--color-primary);
      }
      .storefront-header__nav {
        display: flex;
        align-items: center;
        gap: var(--space-4);
      }
      .storefront-header__nav > a,
      .mega-menu__trigger {
        color: var(--color-text-muted);
        text-decoration: none;
        background: none;
        border: none;
        font-size: var(--font-size-14);
        font-weight: 600;
        padding: var(--space-2) 0;
        border-bottom: 2px solid transparent;
        cursor: pointer;
      }
      .storefront-header__nav > a.is-active {
        color: var(--color-primary);
        border-bottom-color: var(--color-primary);
      }
      .mega-menu {
        position: relative;
      }
      .mega-menu__panel {
        position: absolute;
        top: 100%;
        left: 0;
        min-width: 240px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-hover);
        padding: var(--space-2);
        display: flex;
        flex-direction: column;
      }
      .mega-menu__link {
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-field);
        color: var(--color-text);
        text-decoration: none;
        font-size: var(--font-size-14);
      }
      .mega-menu__link:hover {
        background: var(--color-primary-soft);
        color: var(--color-primary);
      }
      .storefront-header__search {
        position: relative;
        flex: 1;
        max-width: 360px;
      }
      .storefront-header__search-input {
        width: 100%;
        min-height: 40px;
        padding: 0 var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-field);
        font-size: var(--font-size-14);
        background: var(--color-bg);
        color: var(--color-text);
      }
      .storefront-header__search-input:focus {
        outline: 2px solid var(--color-focus);
        outline-offset: 2px;
        border-color: var(--color-primary);
        background: var(--color-surface);
      }
      .search-suggestions {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin: 0;
        padding: var(--space-1);
        list-style: none;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-hover);
        z-index: 10;
      }
      .search-suggestions__item {
        display: block;
        width: 100%;
        text-align: left;
        padding: var(--space-2) var(--space-3);
        border: none;
        background: none;
        border-radius: var(--radius-field);
        font-size: var(--font-size-14);
        color: var(--color-text);
        cursor: pointer;
      }
      .search-suggestions__item:hover {
        background: var(--color-primary-soft);
      }
      .storefront-header__actions {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-left: auto;
      }
      .storefront-header__icon {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: var(--radius-pill);
        color: var(--color-text);
        text-decoration: none;
        font-size: var(--font-size-18);
      }
      .storefront-header__icon:hover {
        background: var(--color-primary-soft);
      }
      .storefront-header__badge {
        position: absolute;
        top: 0;
        right: 0;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        border-radius: var(--radius-pill);
        background: var(--color-primary);
        color: #ffffff;
        font-size: var(--font-size-12);
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .storefront-header__account,
      .storefront-header__signin {
        color: var(--color-primary);
        text-decoration: none;
        font-weight: 600;
        font-size: var(--font-size-14);
        white-space: nowrap;
      }
      .storefront-header__signout {
        border: 1px solid var(--color-border);
        background: var(--color-surface);
        border-radius: var(--radius-button);
        padding: var(--space-2) var(--space-3);
        font-size: var(--font-size-14);
        cursor: pointer;
      }
      @media (max-width: 767px) {
        .storefront-header__inner {
          gap: var(--space-3);
        }
        .storefront-header__name {
          display: none;
        }
        .storefront-header__nav {
          display: none;
        }
        .storefront-header__search {
          max-width: none;
        }
      }
    `,
  ],
})
export class StorefrontHeaderComponent {
  private readonly storefront = inject(StorefrontService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly categories = signal<Category[]>([]);
  readonly menuOpen = signal(false);
  readonly query = signal('');
  readonly suggestions = signal<SearchSuggestion[]>([]);
  readonly cartCount = signal(0);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private searchSub: Subscription | null = null;

  constructor() {
    this.storefront.categories().subscribe((data) => this.categories.set(data));
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onSearchInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.searchSub?.unsubscribe();
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    const q = this.query().trim();
    if (q.length < 2) {
      this.suggestions.set([]);
      return;
    }
    this.searchTimer = setTimeout(() => {
      this.searchSub = this.storefront.search(q).subscribe((suggestions) => {
        this.suggestions.set(suggestions);
      });
    }, 300);
  }

  submitSearch(): void {
    const q = this.query().trim();
    if (q) {
      void this.router.navigate(['/products'], { queryParams: { q } });
      this.suggestions.set([]);
    }
  }

  goToProduct(slug: string): void {
    this.suggestions.set([]);
    void this.router.navigate(['/products', slug]);
  }

  signOut(): void {
    this.auth.logout().subscribe(() => {
      void this.router.navigate(['/sign-in']);
    });
  }
}