import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** `role="status"` for success, `role="alert"` for errors (requirement 23.7). */
  role: 'status' | 'alert';
  /** Visible for at least 5 seconds. */
  durationMs: number;
}

const MIN_DURATION_MS = 5000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly toastsSignal = signal<Toast[]>([]);

  readonly toasts = this.toastsSignal.asReadonly();

  success(message: string, durationMs = MIN_DURATION_MS): number {
    return this.push('success', message, durationMs);
  }

  error(message: string, durationMs = MIN_DURATION_MS): number {
    return this.push('error', message, durationMs);
  }

  info(message: string, durationMs = MIN_DURATION_MS): number {
    return this.push('info', message, durationMs);
  }

  dismiss(id: number): void {
    this.toastsSignal.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  clear(): void {
    this.toastsSignal.set([]);
  }

  private push(kind: ToastKind, message: string, durationMs: number): number {
    const id = this.nextId++;
    const toast: Toast = {
      id,
      kind,
      message,
      role: kind === 'error' ? 'alert' : 'status',
      durationMs: Math.max(durationMs, MIN_DURATION_MS),
    };
    this.toastsSignal.update((toasts) => [...toasts, toast]);
    setTimeout(() => this.dismiss(id), toast.durationMs);
    return id;
  }
}
