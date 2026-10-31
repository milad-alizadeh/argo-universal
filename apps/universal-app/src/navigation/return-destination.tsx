import { returnToOf } from '@repo/client';
import { router, useNavigation, useRoute } from 'expo-router';
import type { NavigationAction } from 'expo-router/react-navigation';
import { useEffect } from 'react';

const goesBack = (action: NavigationAction): boolean =>
  action.type === 'GO_BACK' || action.type === 'POP';

/*
 * A page opened from another section carries the page it was opened from (`returnTo`). Back from it (the header's, the
 * swipe's, the system key) lets the page go from its own stack, so its section later opens at its list, and then shows
 * the page it came from. Placed inside each page, since a page's removal is reported to listeners made in it.
 */
export function ReturnToOrigin(): null {
  const navigation = useNavigation();
  const origin = returnToOf(useRoute().params);

  useEffect(() => {
    // The page is gone when the event arrives, so the listener goes on the next microtask.
    const stop = navigation.addListener('removed', ({ data }): void => {
      if (origin && goesBack(data.action)) router.navigate(origin);
    });

    return (): void => queueMicrotask(stop);
  }, [navigation, origin]);

  return null;
}
