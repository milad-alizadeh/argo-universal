import { HeaderHeightContext } from 'expo-router/react-navigation';
import { useContext } from 'react';
import { hasLiquidGlass } from './native-header';
import { useWide } from './use-wide/use-wide';

// Only a narrow page's Liquid Glass header floats over it; an opaque header, or a wide window's own, sits above the page.
const headerFloats = (wide: boolean): boolean => hasLiquidGlass && !wide;

/*
 * The height of a header that floats over the page, so content that does not scroll can start below it. A scroll view
 * takes the same inset from iOS itself; a plain view does not, and would start under the header. 0 where the header
 * sits above the page.
 */
export function useFloatingHeaderHeight(): number {
  const headerHeight = useContext(HeaderHeightContext);

  return headerFloats(useWide()) ? (headerHeight ?? 0) : 0;
}
