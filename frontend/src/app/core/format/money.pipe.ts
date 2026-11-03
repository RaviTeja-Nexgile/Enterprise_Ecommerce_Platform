import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats integer US cents as USD, e.g. `12999` → `$129.99`.
 * Money is always an integer number of cents; no float arithmetic is used.
 */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(cents: number | null | undefined): string {
    if (cents === null || cents === undefined || Number.isNaN(cents)) {
      return '$0.00';
    }
    const sign = cents < 0 ? '-' : '';
    const absolute = Math.abs(Math.trunc(cents));
    const dollars = Math.floor(absolute / 100);
    const remainder = absolute % 100;
    return `${sign}$${dollars.toLocaleString('en-US')}.${String(remainder).padStart(2, '0')}`;
  }
}
