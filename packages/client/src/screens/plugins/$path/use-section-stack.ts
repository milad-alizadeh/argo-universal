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
import { z } from 'zod';
import { pluginPagePath } from '../plugin-page-route';
import {
  useShownPagePlace,
  type ShownSectionPage,
} from '../plugin-section-view';

type Navigation = NavigationProp<ParamListBase>;

type Stack = ReturnType<Navigation['getState']>;

type StackRoute = Stack['routes'][number];

// Whether the page's section is the one on screen, which its navigator says around its stack.
export const SectionShown = createContext(true);

const pageParams = z.object({ path: z.array(z.string()) });

const routeOf = (route: StackRoute): readonly string[] =>
  pageParams.safeParse(route.params).data?.path ?? [];

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

interface StackPlace {
  below: number;
  top: number;
}

function useStackPlace(): StackPlace {
  const { key } = useRoute();

  return {
    below: useNavigationState((stack: Stack) =>
      stack.routes.findIndex((route) => route.key === key),
    ),
    top: useNavigationState((stack: Stack) => stack.index),
  };
}

const shownPage = (
  navigation: Navigation,
  pages: string,
): ShownSectionPage => ({
  pages: pages.split('\n'),
  showOnly: (route) => {
    showOnlyIn(navigation, route);
  },
});

// The shown page tells the section's list which pages the section is showing and how to replace them.
function useTellSectionList(): SectionStackPage['showOnly'] {
  const navigation = useNavigation<Navigation>();
  const pages = useNavigationState(pagesOf);
  const place = useShownPagePlace();
  const isShown = useIsShownPage();

  const value = useMemo(
    () => shownPage(navigation, pages),
    [navigation, pages],
  );

  useClaim(isShown ? place : undefined, value);

  return value.showOnly;
}

// Where a Plugin page sits in its section's stack, read from the stack itself.
export function useSectionStackPage(): SectionStackPage {
  const sectionShown = use(SectionShown);
  const { below, top } = useStackPlace();
  const showOnly = useTellSectionList();

  return {
    below,
    needed: sectionShown && top - below <= 1,
    shown: sectionShown && top === below,
    showOnly,
  };
}
