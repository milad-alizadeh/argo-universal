import { NavigationContext } from 'expo-router/react-navigation';
import { use, useMemo, useSyncExternalStore } from 'react';
import { useWide } from './use-wide/use-wide';

type Navigation = NonNullable<React.ContextType<typeof NavigationContext>>;

interface FocusStore {
  subscribe: (notify: () => void) => () => void;
  read: () => boolean;
}

const idle = (): void => {};

// Without a navigator, as in a preview, a page always is focused.
const alwaysFocused: FocusStore = { subscribe: () => idle, read: () => true };

function listenToFocus(navigation: Navigation, ask: () => void): () => void {
  const offFocus = navigation.addListener('focus', ask);
  const offBlur = navigation.addListener('blur', ask);

  return (): void => {
    offFocus();
    offBlur();
  };
}

// Asks the navigator again and tells the store's readers when the answer changed.
function askerFor(
  navigation: Navigation,
  held: { focused: boolean },
  notify: () => void,
): () => void {
  return (): void => {
    const next = navigation.isFocused();

    if (next === held.focused) return;

    held.focused = next;
    notify();
  };
}

/*
 * React Navigation warns when `navigation.isFocused()` runs during render, so the store never calls it there.
 * It holds the last answer and asks again only once subscribed, and on every focus and blur, none of which is a render.
 * A page is taken as focused until then.
 */
function focusStoreOf(navigation: Navigation | undefined): FocusStore {
  if (!navigation) return alwaysFocused;

  const held = { focused: true };

  return {
    subscribe: (notify) => {
      const ask = askerFor(navigation, held, notify);
      const off = listenToFocus(navigation, ask);

      ask();

      return off;
    },
    read: () => held.focused,
  };
}

// A page its navigator keeps behind the shown one is not focused.
export function usePageFocused(): boolean {
  const navigation = use(NavigationContext);
  const store = useMemo(() => focusStoreOf(navigation), [navigation]);

  return useSyncExternalStore(store.subscribe, store.read);
}

// The one rule for every Place: only the shown page may hold it, and only on a wide window.
export function useIsShownPage(): boolean {
  const wide = useWide();

  return usePageFocused() && wide;
}
