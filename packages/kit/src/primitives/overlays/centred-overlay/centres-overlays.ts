import { useSizeClass } from '../../../use-size-class/use-size-class';

// On the web a dialog, or a sheet the app opens itself, centres on the window from the medium size class up; a compact window raises it from the bottom edge.
export function useCentresOverlays(): boolean {
  return useSizeClass() !== 'compact';
}
