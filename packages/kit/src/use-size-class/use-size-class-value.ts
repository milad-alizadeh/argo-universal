import { type SizeClassValue, sizeClassValue } from './size-class-value';
import { useSizeClass } from './use-size-class';

// The kit resolves its size-class props here; features pass the values and never read the size class.
export function useSizeClassValue<T>(value: SizeClassValue<T>): T {
  return sizeClassValue(value, useSizeClass());
}
