import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <h1 class="page-title">Page not found</h1>
      <p>The page you asked for does not exist.</p>
      <p><a routerLink="/">Go to the home page</a></p>
    </div>
  `,
})
export class NotFoundComponent {}
