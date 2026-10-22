import { withoutNewSession } from '@repo/client';
import { useWide } from '@repo/client/size-class';
import type { Stack } from 'expo-router';
import {
  CommonActions,
  type NavigationProp,
  type NavigationState,
  type ParamListBase,
} from 'expo-router/react-navigation';
import type { ComponentProps } from 'react';

type PageListeners = NonNullable<
  ComponentProps<typeof Stack.Screen>['listeners']
>;

const noListeners: PageListeners = {};

type Navigation = NavigationProp<ParamListBase>;

/*
 * The Frame's own state carries the section's shorter stack: Expo Router 58 reads a reset that
 * shortens a stack as a browser Back, which would drop the page New Session was opened from out of
 * the browser's history, while the Frame's own routes are untouched and its history stands.
 */
const withStack = (
  frame: NavigationState,
  pages: NavigationState,
): NavigationState => ({
  ...frame,
  routes: frame.routes.map((route) =>
    route.state?.key === pages.key ? { ...route, state: pages } : route,
  ),
});

// Drops New Session from the section's stack, which closes its empty Session.
function closeNewSession(navigation: Navigation): void {
  const pages = navigation.getState();
  const next = withoutNewSession(pages);
  const frame = navigation.getParent();

  if (!next || !frame) return;

  const state = withStack(frame.getState(), { ...pages, ...next });

  frame.dispatch({ ...CommonActions.reset(state), target: state.key });
}

/*
 * Beside the list, on a wide window, hiding Sessions closes New Session's empty Session, as leaving the
 * section did before sections stayed mounted: the page leaves the section's stack, and the
 * list shows its empty detail again when Sessions shows. A page swapped out within the shown
 * section is gone already. The phone shell keeps New Session open.
 */
const closeWhenSectionHidden: PageListeners = ({ navigation }) => ({
  blur: (): void => {
    if (navigation.getParent()?.isFocused() === false)
      closeNewSession(navigation);
  },
});

// The listeners for a Session's page at this width.
export const useNewSessionListeners = (): PageListeners =>
  useWide() ? closeWhenSectionHidden : noListeners;
