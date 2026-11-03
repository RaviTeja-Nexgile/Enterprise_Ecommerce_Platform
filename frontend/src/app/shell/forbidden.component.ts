import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <h1 class="page-title">No access</h1>
      <p role="alert">You do not have access to this page</p>
      <p><a routerLink="/">Go to the home page</a></p>
    </div>
  `,
})
export class ForbiddenComponent {}
