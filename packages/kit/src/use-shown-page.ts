import { useIsFocused } from 'expo-router';
import { NavigationContext } from 'expo-router/react-navigation';
import { use } from 'react';
import { useWide } from './use-wide/use-wide';

/*
 * A page its navigator keeps behind the shown one is not focused. Without a navigator, as in a preview, a page always is.
 * The navigator's own focus state is read, never `navigation.isFocused()`, which React Navigation warns about during render.
 * A page is mounted inside its navigator for good, so the branch below never changes between renders.
 */
export function usePageFocused(): boolean {
  const navigator = use(NavigationContext) !== undefined;

  // oxlint-disable-next-line react/rules-of-hooks
  return navigator ? useIsFocused() : true;
}

// The one rule for every Place: only the shown page may hold it, and only on a wide window.
export function useIsShownPage(): boolean {
  const wide = useWide();

  return usePageFocused() && wide;
}
