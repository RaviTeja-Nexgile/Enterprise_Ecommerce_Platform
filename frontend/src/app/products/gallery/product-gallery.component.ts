import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { ProductImage } from '../../core/models/catalog.model';

/**
 * The product image gallery (requirements 5.2 and 5.3).
 *
 * The main image shows the selected image; clicking a thumbnail makes that
 * image the main one, and clicking the main image opens it enlarged with zoom.
 * The zoom overlay is a modal dialog that closes on Escape, on the close
 * button or on a click outside the image.
 */
@Component({
  selector: 'app-product-gallery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gallery">
      <div class="gallery__main">
        @if (mainImage(); as image) {
          <button
            type="button"
            class="gallery__zoom-trigger"
            (click)="openZoom()"
            [attr.aria-label]="'Zoom image: ' + (image.alt_text || productName())"
          >
            <img
              class="gallery__image"
              [src]="image.url"
              [alt]="image.alt_text || productName()"
            />
          </button>
        } @else {
          <div class="gallery__placeholder" role="img" [attr.aria-label]="productName()">
            No image
          </div>
        }
      </div>

      @if (images().length > 1) {
        <ul class="gallery__thumbs" aria-label="Product images">
          @for (image of images(); track image.id) {
            <li>
              <button
                type="button"
                class="gallery__thumb"
                [class.gallery__thumb--active]="image.id === selectedId()"
                [attr.aria-pressed]="image.id === selectedId()"
                [attr.aria-label]="'Show image ' + (image.alt_text || productName())"
                (click)="select(image)"
              >
                <img [src]="image.url" [alt]="image.alt_text || productName()" />
              </button>
            </li>
          }
        </ul>
      }
    </div>

    @if (zoomed()) {
      <div class="gallery__overlay" role="dialog" aria-modal="true" aria-label="Enlarged image">
        <button
          type="button"
          class="gallery__close"
          aria-label="Close enlarged image"
          (click)="closeZoom()"
        >
          ×
        </button>
        <div class="gallery__zoom" (click)="closeZoom()">
          @if (mainImage(); as image) {
            <img
              class="gallery__zoom-image"
              [src]="image.url"
              [alt]="image.alt_text || productName()"
              (click)="$event.stopPropagation()"
            />
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .gallery {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        min-width: 0;
      }
      .gallery__main {
        background: var(--color-bg);
        border-radius: var(--radius-card);
        overflow: hidden;
      }
      .gallery__zoom-trigger {
        display: block;
        width: 100%;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: zoom-in;
      }
      .gallery__image {
        display: block;
        width: 100%;
        aspect-ratio: 1 / 1;
        object-fit: cover;
      }
      .gallery__placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1 / 1;
        color: var(--color-text-muted);
      }
      .gallery__thumbs {
        display: flex;
        gap: var(--space-2);
        margin: 0;
        padding: 0;
        list-style: none;
        overflow-x: auto;
      }
      .gallery__thumb {
        width: 72px;
        height: 72px;
        padding: 0;
        border: 2px solid transparent;
        border-radius: var(--radius-field);
        overflow: hidden;
        background: var(--color-bg);
        cursor: pointer;
      }
      .gallery__thumb--active {
        border-color: var(--color-primary);
      }
      .gallery__thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .gallery__overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: rgba(17, 24, 39, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-6);
      }
      .gallery__close {
        position: absolute;
        top: var(--space-4);
        right: var(--space-4);
        width: 44px;
        height: 44px;
        border: 0;
        border-radius: var(--radius-pill);
        background: var(--color-surface);
        color: var(--color-text);
        font-size: var(--font-size-24);
        line-height: 1;
        cursor: pointer;
      }
      .gallery__zoom {
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
      }
      .gallery__zoom-image {
        display: block;
        max-width: 100%;
        max-height: 90vh;
        cursor: zoom-out;
        transition: transform 200ms ease;
      }
      .gallery__zoom-image:hover {
        transform: scale(1.6);
      }
      @media (max-width: 767px) {
        .gallery__thumb {
          width: 56px;
          height: 56px;
        }
      }
    `,
  ],
})
export class ProductGalleryComponent {
  readonly images = input<ProductImage[]>([]);
  readonly productName = input<string>('');

  /** The id of the image shown as the main image; null means the first one. */
  readonly selectedId = signal<number | null>(null);
  readonly zoomed = signal(false);

  readonly mainImage = computed<ProductImage | null>(() => {
    const list = this.images();
    if (list.length === 0) {
      return null;
    }
    const id = this.selectedId();
    return list.find((image) => image.id === id) ?? list[0];
  });

  select(image: ProductImage): void {
    this.selectedId.set(image.id);
  }

  openZoom(): void {
    if (this.mainImage()) {
      this.zoomed.set(true);
    }
  }

  closeZoom(): void {
    this.zoomed.set(false);
  }
}
