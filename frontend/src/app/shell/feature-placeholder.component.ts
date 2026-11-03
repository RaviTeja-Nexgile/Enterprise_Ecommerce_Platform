import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { EmptyStateComponent } from '../shared/empty-state/empty-state.component';

/**
 * A placeholder for a feature folder whose screen a later task builds. It
 * keeps every lazy route in the shell navigable while the app is assembled.
 */
@Component({
  selector: 'app-feature-placeholder',
  standalone: true,
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <h1 class="page-title">{{ heading }}</h1>
      <app-empty-state [message]="message" icon="🚧" />
    </div>
  `,
})
export class FeaturePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  readonly heading = (this.route.snapshot.data['heading'] as string) ?? 'Coming soon';
  readonly message = (this.route.snapshot.data['message'] as string) ?? 'This screen is being built.';
}
