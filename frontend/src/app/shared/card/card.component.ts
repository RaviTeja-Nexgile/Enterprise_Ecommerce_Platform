import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A white surface card with 12 px corners and the resting elevation. */
@Component({
  selector: 'app-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card" [class.card--interactive]="interactive()">
      @if (title()) {
        <header class="card__header">
          <h2 class="card__title">{{ title() }}</h2>
          <ng-content select="[card-actions]" />
        </header>
      }
      <ng-content />
    </section>
  `,
  styles: [
    `
      .card {
        background: var(--color-surface);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-resting);
        padding: var(--space-6);
      }
      .card--interactive {
        transition:
          box-shadow 160ms ease,
          transform 160ms ease;
      }
      .card--interactive:hover {
        box-shadow: var(--elevation-hover);
        transform: translateY(-2px);
      }
      .card__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        margin-bottom: var(--space-4);
      }
      .card__title {
        margin: 0;
        font-size: var(--font-size-18);
      }
    `,
  ],
})
export class CardComponent {
  readonly title = input<string | null>(null);
  readonly interactive = input(false);
}
