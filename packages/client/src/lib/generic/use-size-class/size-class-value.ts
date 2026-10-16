import type { SizeClass } from './size-class';

// Medium follows compact unless a caller supplies its approved medium layout.
export interface SizeClassValues<T> {
  compact: T;
  medium?: T;
  wide: T;
}

export type SizeClassValue<T> = T | SizeClassValues<T>;

export function isPerSizeClass<T>(
  value: SizeClassValue<T>,
): value is SizeClassValues<T> {
  return value instanceof Object && 'compact' in value && 'wide' in value;
}

function pick<T>(values: SizeClassValues<T>, sizeClass: SizeClass): T {
  const resolved: Record<SizeClass, T> = {
    compact: values.compact,
    medium: values.medium === undefined ? values.compact : values.medium,
    wide: values.wide,
  };

  return resolved[sizeClass];
}

export function sizeClassValue<T>(
  value: SizeClassValue<T>,
  sizeClass: SizeClass,
): T {
  return isPerSizeClass(value) ? pick(value, sizeClass) : value;
}
