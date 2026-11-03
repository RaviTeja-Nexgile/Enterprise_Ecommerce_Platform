import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';

/**
 * The app shell: a storefront header, the routed screen and a footer.
 * The admin dashboard draws its own sidebar inside `/admin`.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <div class="header__inner container">
        <a class="header__logo" routerLink="/" aria-label="E-Commerce Platform home">
          <span class="header__mark" aria-hidden="true">◆</span>
          <span>E-Commerce Platform</span>
        </a>

        <nav class="header__nav" aria-label="Main">
          <a routerLink="/" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">
            Home
          </a>
          <a routerLink="/products" routerLinkActive="is-active">Products</a>
          @if (auth.isSignedIn()) {
            <a routerLink="/wishlist" routerLinkActive="is-active">Wishlist</a>
            <a routerLink="/account" routerLinkActive="is-active">Account</a>
            @if (isAdmin()) {
              <a routerLink="/admin" routerLinkActive="is-active">Admin</a>
            }
          }
        </nav>

        <div class="header__actions">
          <a routerLink="/cart" class="header__cart" aria-label="Cart">Cart</a>
          @if (auth.isSignedIn()) {
            <button type="button" class="header__signout" (click)="signOut()">Sign out</button>
          } @else {
            <a routerLink="/sign-in" class="header__signin">Sign in</a>
          }
        </div>
      </div>
    </header>

    <main id="main-content" class="main" tabindex="-1">
      <router-outlet />
    </main>

    <footer class="footer">
      <div class="container footer__inner">
        <p class="footer__brand">E-Commerce Platform</p>
        <nav aria-label="Footer">
          <a routerLink="/products">Products</a>
          <a routerLink="/cart">Cart</a>
          <a routerLink="/account">Account</a>
        </nav>
        <p class="footer__note">Runs locally. No cloud services.</p>
      </div>
    </footer>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .header {
        position: sticky;
        top: 0;
        z-index: 100;
        height: var(--header-height);
        background: var(--color-surface);
        border-bottom: 1px solid var(--color-border);
      }
      .header__inner {
        display: flex;
        align-items: center;
        gap: var(--space-6);
        height: 100%;
      }
      .header__logo {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        font-weight: 600;
        color: var(--color-text);
        text-decoration: none;
      }
      .header__mark {
        color: var(--color-primary);
      }
      .header__nav {
        display: flex;
        gap: var(--space-4);
        flex: 1;
      }
      .header__nav a {
        color: var(--color-text-muted);
        text-decoration: none;
        padding: var(--space-2) 0;
        border-bottom: 2px solid transparent;
      }
      .header__nav a.is-active {
        color: var(--color-primary);
        border-bottom-color: var(--color-primary);
      }
      .header__actions {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }
      .header__signin,
      .header__cart {
        color: var(--color-primary);
        text-decoration: none;
        font-weight: 600;
      }
      .header__signout {
        border: 1px solid var(--color-border);
        background: var(--color-surface);
        border-radius: var(--radius-button);
        padding: var(--space-2) var(--space-3);
        cursor: pointer;
      }
      .main {
        flex: 1;
        padding: var(--space-8) 0;
      }
      .footer {
        background: var(--color-surface);
        border-top: 1px solid var(--color-border);
        padding: var(--space-6) 0;
      }
      .footer__inner {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        font-size: var(--font-size-14);
        color: var(--color-text-muted);
      }
      .footer__brand {
        margin: 0;
        font-weight: 600;
        color: var(--color-text);
      }
      .footer__inner nav {
        display: flex;
        gap: var(--space-4);
      }
      .footer__note {
        margin: 0;
      }
      @media (max-width: 767px) {
        .header__inner {
          gap: var(--space-3);
        }
        .header__nav {
          overflow-x: auto;
        }
        .header__logo span:last-child {
          display: none;
        }
        .main {
          padding: var(--space-4) 0;
        }
      }
    `,
  ],
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  isAdmin(): boolean {
    return this.auth.hasRole('Super Admin', 'Admin', 'Inventory Manager', 'Order Manager');
  }

  signOut(): void {
    this.auth.logout().subscribe(() => {
      void this.router.navigate(['/sign-in']);
    });
  }
}
