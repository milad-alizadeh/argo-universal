import { useSizeClass } from '../use-size-class/use-size-class';

// The desktop drawing: a wide window, where the list sits beside the pages; compact and medium take the phone shell (ADR-0026).
export function useWide(): boolean {
  return useSizeClass() === 'wide';
}
