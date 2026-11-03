import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiClient } from '../core/api/api-client.service';
import { HealthResponse } from '../core/models/api.model';
import { ButtonComponent } from '../shared/button/button.component';
import { CardComponent } from '../shared/card/card.component';

/**
 * The home page. Task 3.1 replaces this with the full storefront home built
 * from `GET /api/v1/storefront/home`; for now it shows the shell, the API
 * status and the links into the rest of the app.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ButtonComponent, CardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <section class="hero">
        <h1>Shop the essentials, managed end to end</h1>
        <p class="hero__lead">
          A storefront and an admin dashboard over one local API. Browse the catalog, fill a
          cart and check out with a mock card payment.
        </p>
        <div class="hero__actions">
          <a routerLink="/products" class="hero__cta">Browse products</a>
          <a routerLink="/sign-in" class="hero__secondary">Sign in</a>
        </div>
      </section>

      <div class="grid">
        <app-card title="API status">
          @if (apiStatus() === 'ok') {
            <p class="text-success" role="status">The API is reachable.</p>
          } @else if (apiStatus() === 'down') {
            <p class="text-error" role="alert">
              The API could not be reached. Start it with <code>npm run dev</code>.
            </p>
          } @else {
            <p class="muted">Checking the API…</p>
          }
        </app-card>

        <app-card title="Demo accounts">
          <ul class="accounts">
            <li><strong>Super Admin</strong> admin&#64;example.com / Admin&#64;12345</li>
            <li><strong>Customer</strong> customer&#64;example.com / Customer&#64;12345</li>
          </ul>
        </app-card>
      </div>
    </div>
  `,
  styles: [
    `
      .hero {
        padding: var(--space-12) 0 var(--space-8);
        max-width: 720px;
      }
      .hero h1 {
        font-size: var(--font-size-48);
        margin-bottom: var(--space-4);
      }
      .hero__lead {
        font-size: var(--font-size-18);
        color: var(--color-text-muted);
        margin-bottom: var(--space-6);
      }
      .hero__actions {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
      }
      .hero__cta,
      .hero__secondary {
        display: inline-flex;
        align-items: center;
        min-height: 48px;
        padding: 0 var(--space-6);
        border-radius: var(--radius-button);
        font-weight: 600;
        text-decoration: none;
      }
      .hero__cta {
        background: var(--color-primary);
        color: #ffffff;
      }
      .hero__cta:hover {
        background: var(--color-primary-hover);
        color: #ffffff;
        text-decoration: none;
      }
      .hero__secondary {
        border: 1px solid var(--color-border);
        color: var(--color-text);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: var(--space-6);
      }
      .accounts {
        margin: 0;
        padding-left: var(--space-4);
        display: grid;
        gap: var(--space-2);
      }
      @media (max-width: 767px) {
        .hero h1 {
          font-size: var(--font-size-32);
        }
      }
    `,
  ],
})
export class HomeComponent {
  private readonly api = inject(ApiClient);
  readonly apiStatus = signal<'checking' | 'ok' | 'down'>('checking');

  constructor() {
    this.api.health().subscribe({
      next: (response: HealthResponse) => this.apiStatus.set(response.status === 'ok' ? 'ok' : 'down'),
      error: () => this.apiStatus.set('down'),
    });
  }
}
