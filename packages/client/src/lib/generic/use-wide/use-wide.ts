import { useSizeClass } from '../use-size-class/use-size-class';

// The desktop drawing: a medium or wide window, where the list sits beside the pages (ADR-0026).
export function useWide(): boolean {
  return useSizeClass() !== 'compact';
}
