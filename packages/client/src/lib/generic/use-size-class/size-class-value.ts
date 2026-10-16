import type { SizeClass } from './size-class';

// One value per size class, as the kit's props take it; medium follows compact until it has a Paper design (#762).
export interface SizeClassValues<T> {
  compact: T;
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
    medium: values.compact,
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
