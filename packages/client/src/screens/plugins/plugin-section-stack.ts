import { useClaim, useClaimed, type Place } from '@repo/kit/place';
import { useIsShownPage } from '@repo/kit/use-shown-page';
import { useNavigation, useRoute } from 'expo-router';
import {
  CommonActions,
  useNavigationState,
  type NavigationProp,
  type ParamListBase,
} from 'expo-router/react-navigation';
import {
  createContext,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
} from 'react';
import { z } from 'zod';
import { pluginPagePath, routeKey } from './plugin-page-route';
import { landingOf, landingRoute } from './plugin-section-tree';
import { stackPageOf, type StackPage } from './plugin-stack-page';
import { usePluginSections, type PluginSection } from './use-plugin-sections';
import type { PluginView } from './use-plugin-view';

/*
 * A wide window's section list and the pages of its section's stack reach each other only through these Places: the
 * list offers its live root view, and the shown page offers the stack it is showing and how to replace it.
 */

export interface ShownSectionPage {
  // The section's stack, shown page first.
  pages: readonly string[];
  showOnly: (route: readonly string[]) => void;
}

// The live root view, for the root's own page to draw instead of opening a second view of the same path.
export interface SectionRoot {
  section: PluginSection;
  view: PluginView;
}

export interface SectionPlaces {
  root: Place<SectionRoot>;
  shown: Place<ShownSectionPage>;
}

export const SectionPlacesContext = createContext<SectionPlaces | undefined>(
  undefined,
);

export function useSectionPlaces(): SectionPlaces {
  const places = use(SectionPlacesContext);

  if (!places) throw new Error('A Plugin page sits outside PluginSectionLists');

  return places;
}

// Whether the page's section is the one on screen, which its navigator says around its stack.
export const SectionShown = createContext(true);

type Navigation = NavigationProp<ParamListBase>;

type Stack = ReturnType<Navigation['getState']>;

type StackRoute = Stack['routes'][number];

const pageParams = z.object({ path: z.array(z.string()) });

const routeOf = (route: StackRoute): readonly string[] =>
  pageParams.safeParse(route.params).data?.path ?? [];

// One string per page, shown page first, so a page reads no change while the stack's pages stay the same.
const PAGE_BREAK = '\n';

const pagesOf = ({ routes, index }: Stack): string =>
  routes
    .slice(0, index + 1)
    .reverse()
    .map((route) => pluginPagePath(routeOf(route)))
    .join(PAGE_BREAK);

function showOnlyIn(navigation: Navigation, route: readonly string[]): void {
  const stack = navigation.getState();
  const key = routeKey(route);
  const kept = stack.routes.find((page) => routeKey(routeOf(page)) === key);
  const page = kept ?? { name: '[...path]', params: { path: [...route] } };

  navigation.dispatch(
    CommonActions.reset({ ...stack, index: 0, routes: [page] }),
  );
}

export interface SectionStackPage extends StackPage {
  // How many pages sit below this one in its section's stack.
  below: number;
  showOnly: (route: readonly string[]) => void;
}

// How many pages sit below this one, and how far below the shown page it is, capped where every page is alike.
interface StackPlace {
  below: number;
  distance: number;
}

function useStackPlace(): StackPlace {
  const { key } = useRoute();

  const indexOf = (stack: Stack): number =>
    stack.routes.findIndex((route) => route.key === key);

  return {
    below: useNavigationState(indexOf),
    distance: useNavigationState((stack: Stack) =>
      Math.min(stack.index - indexOf(stack), 2),
    ),
  };
}

// The shown page tells the section's list which pages the section is showing and how to replace them.
function useClaimShownPage(showOnly: SectionStackPage['showOnly']): void {
  const pages = useNavigationState(pagesOf);
  const place = useSectionPlaces().shown;
  const isShown = useIsShownPage();

  const value = useMemo(
    () => ({ pages: pages.split(PAGE_BREAK), showOnly }),
    [pages, showOnly],
  );

  useClaim(isShown ? place : undefined, value);
}

// Where a Plugin page sits in its section's stack, read from the stack itself.
export function useSectionStackPage(): SectionStackPage {
  const navigation = useNavigation<Navigation>();
  const sectionShown = use(SectionShown);
  const { below, distance } = useStackPlace();

  const showOnly = useCallback(
    (route: readonly string[]) => showOnlyIn(navigation, route),
    [navigation],
  );

  useClaimShownPage(showOnly);

  return { below, ...stackPageOf(sectionShown, distance), showOnly };
}

// The route a section's root lands on, as one string so the effect below reads no change while it stays the same.
function useLandingKey(
  section: PluginSection,
  root: PluginView['root'] | undefined,
): string | undefined {
  const sections = usePluginSections();
  const landing = landingOf(root);

  if (landing === undefined) return undefined;

  const route = landingRoute(sections, section, landing);

  return route && routeKey(route);
}

function useClaimedRoot(section: PluginSection): PluginView | undefined {
  const claimed = useClaimed(useSectionPlaces().root);

  return claimed?.section.id === section.id ? claimed.view : undefined;
}

// The landing replaces the stack once the root is shown, so the page under it is never the one left on screen.
function useLand(
  landing: string | undefined,
  { shown, showOnly }: SectionStackPage,
): void {
  useLayoutEffect(() => {
    if (shown && landing !== undefined) showOnly(landing.split('/'));
  }, [shown, landing, showOnly]);
}

/*
 * The section's live root view, while a wide window shows that section. The page the root declares it lands on takes
 * the root's place in the stack as soon as the root is shown, so a wide window never lands on an empty detail; until
 * then, and while the view loads, there is no view to draw.
 */
export function useSectionRoot(
  section: PluginSection,
  stack: SectionStackPage,
): PluginView | undefined {
  const view = useClaimedRoot(section);
  const landing = useLandingKey(section, view?.root);

  useLand(landing, stack);

  return landing === undefined ? view : undefined;
}
