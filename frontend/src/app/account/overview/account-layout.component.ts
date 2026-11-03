import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * The account area frame: a left menu on desktop and a horizontal tab strip on
 * phone (design.md "Look and feel" — Account).
 */
@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="account container">
      <nav class="account__menu" aria-label="Account">
        <a
          routerLink="/account"
          routerLinkActive="is-active"
          [routerLinkActiveOptions]="{ exact: true }"
        >
          Overview
        </a>
        <a routerLink="/account/profile" routerLinkActive="is-active">Profile</a>
        <a routerLink="/account/addresses" routerLinkActive="is-active">Addresses</a>
        <a routerLink="/account/orders" routerLinkActive="is-active">Orders</a>
        <a routerLink="/account/reviews" routerLinkActive="is-active">Reviews</a>
      </nav>
      <div class="account__content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [
    `
      .account {
        display: grid;
        grid-template-columns: 220px minmax(0, 1fr);
        gap: var(--space-8);
        align-items: start;
      }
      .account__menu {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding: var(--space-3);
        background: var(--color-surface);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-resting);
        position: sticky;
        top: calc(var(--header-height) + var(--space-4));
      }
      .account__menu a {
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-button);
        color: var(--color-text-muted);
        text-decoration: none;
        font-weight: 600;
        font-size: var(--font-size-14);
      }
      .account__menu a:hover {
        background: var(--color-primary-soft);
        color: var(--color-primary);
      }
      .account__menu a.is-active {
        background: var(--color-primary-soft);
        color: var(--color-primary);
      }
      .account__menu a:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 2px;
      }
      .account__content {
        min-width: 0;
      }
      @media (max-width: 767px) {
        .account {
          grid-template-columns: minmax(0, 1fr);
          gap: var(--space-4);
        }
        .account__menu {
          position: static;
          flex-direction: row;
          overflow-x: auto;
          padding: var(--space-1);
          gap: var(--space-1);
        }
        .account__menu a {
          white-space: nowrap;
        }
      }
    `,
  ],
})
export class AccountLayoutComponent {}
