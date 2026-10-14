import { useSizeClass } from '../use-size-class/use-size-class';

// Today's wide layout; Tier 1 scaffolds replace its callers with useSizeClass.
export function useWide(): boolean {
  return useSizeClass() === 'wide';
}
