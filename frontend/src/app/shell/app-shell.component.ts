import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { StorefrontFooterComponent } from '../storefront/footer/footer.component';
import { StorefrontHeaderComponent } from '../storefront/header/header.component';

/**
 * The app shell: the storefront header, the routed screen and the storefront
 * footer. The admin dashboard draws its own sidebar inside `/admin`.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, StorefrontHeaderComponent, StorefrontFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-storefront-header />

    <main id="main-content" class="main" tabindex="-1">
      <router-outlet />
    </main>

    <app-storefront-footer />
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .main {
        flex: 1;
        padding: var(--space-8) 0;
      }
      @media (max-width: 767px) {
        .main {
          padding: var(--space-4) 0;
        }
      }
    `,
  ],
})
export class AppShellComponent {}
