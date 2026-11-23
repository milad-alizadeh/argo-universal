import {
  NavigationContext,
  NavigationRouteContext,
} from 'expo-router/react-navigation';
import { createContext, use, useMemo, useSyncExternalStore } from 'react';
import { useWide } from './use-wide/use-wide';

// A retained page stays mounted while another page in the same route is shown.
export const RetainedPageVisibility = createContext(true);

// A Frame keeps the top page of this stack drawn under its modal.
export const SectionBackdropVisibility = createContext(false);

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
  read: () => boolean,
  held: { focused: boolean },
  notify: () => void,
): () => void {
  return (): void => {
    const next = read();

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
function focusStoreOf(
  navigation: Navigation | undefined,
  openRoute?: string,
): FocusStore {
  if (!navigation) return alwaysFocused;

  const held = { focused: true };

  return {
    subscribe: (notify) => {
      const read = (): boolean =>
        openRoute ? topPageIs(navigation, openRoute) : navigation.isFocused();

      const ask = askerFor(read, held, notify);
      const off = listenToFocus(navigation, ask);
      const offState = openRoute ? navigation.addListener('state', ask) : idle;

      ask();

      return () => {
        off();

        offState();
      };
    },
    read: () => held.focused,
  };
}

function topPageIs(navigation: Navigation, key: string): boolean {
  const state = navigation.getState();

  return state.routes[state.index]?.key === key;
}

function usePageVisibility(openRoute?: string): boolean {
  const navigation = use(NavigationContext);

  const store = useMemo(
    () => focusStoreOf(navigation, openRoute),
    [navigation, openRoute],
  );

  const visible = use(RetainedPageVisibility);

  return useSyncExternalStore(store.subscribe, store.read) && visible;
}

// A page behind a modal is still drawn, but it no longer has navigation focus.
export function usePageFocused(): boolean {
  return usePageVisibility();
}

// The Frame's Places stay with the drawn page, including while a modal is above it.
export function useDrawnPage(): boolean {
  const backdrop = use(SectionBackdropVisibility);
  const route = use(NavigationRouteContext);

  return usePageVisibility(backdrop ? route?.key : undefined);
}

export function useIsShownPage(): boolean {
  const wide = useWide();

  return useDrawnPage() && wide;
}
