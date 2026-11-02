import { useClaim } from '@repo/kit/place';
import { useIsShownPage } from '@repo/kit/use-shown-page';
import { useNavigation, useRoute } from 'expo-router';
import {
  CommonActions,
  useNavigationState,
  type NavigationProp,
  type ParamListBase,
} from 'expo-router/react-navigation';
import { createContext, use, useMemo } from 'react';
import { pluginPagePath } from '../plugin-page-route';
import { useShownPagePlace } from '../plugin-section-view';

type Navigation = NavigationProp<ParamListBase>;

type Stack = ReturnType<Navigation['getState']>;

type StackRoute = Stack['routes'][number];

// Whether the page's section is the one on screen, which its navigator says around its stack.
export const SectionShown = createContext(true);

const routeOf = (route: StackRoute): readonly string[] =>
  (route.params as { path?: readonly string[] } | undefined)?.path ?? [];

// The stack's pages, shown page first, as one string so a page reads no change while they stay the same.
const pagesOf = ({ routes, index }: Stack): string =>
  routes
    .slice(0, index + 1)
    .reverse()
    .map((route) => pluginPagePath(routeOf(route)))
    .join('\n');

function showOnlyIn(navigation: Navigation, route: readonly string[]): void {
  const stack = navigation.getState();
  const kept = stack.routes.find(
    (candidate) => routeOf(candidate).join('/') === route.join('/'),
  );
  const page = kept ?? { name: '[...path]', params: { path: [...route] } };

  navigation.dispatch(
    CommonActions.reset({ ...stack, index: 0, routes: [page] }),
  );
}

export interface SectionStackPage {
  // How many pages sit below this one in its section's stack.
  below: number;
  // The page is on screen, or is the one directly below it, which Back returns to. Any other page closes its view.
  needed: boolean;
  // The page is the one on screen.
  shown: boolean;
  showOnly: (route: readonly string[]) => void;
}

// Where a Plugin page sits in its section's stack, read from the stack itself. The shown page tells the section's list.
export function useSectionStackPage(): SectionStackPage {
  const navigation = useNavigation<Navigation>();
  const { key } = useRoute();
  const sectionShown = use(SectionShown);
  const below = useNavigationState((stack: Stack) =>
    stack.routes.findIndex((route) => route.key === key),
  );
  const top = useNavigationState((stack: Stack) => stack.index);
  const pages = useNavigationState(pagesOf);
  const place = useShownPagePlace();
  const isShown = useIsShownPage();

  const value = useMemo(
    () => ({
      pages: pages.split('\n'),
      showOnly: (route: readonly string[]) => showOnlyIn(navigation, route),
    }),
    [navigation, pages],
  );

  useClaim(isShown ? place : undefined, value);

  return {
    below,
    needed: sectionShown && top - below <= 1,
    shown: sectionShown && top === below,
    showOnly: value.showOnly,
  };
}
