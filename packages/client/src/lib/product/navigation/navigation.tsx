import {
  type Href,
  router,
  useIsFocused,
  useNavigation,
  useNavigationContainerRef,
  usePathname,
} from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import type * as React from 'react';
import { createContext, type ReactNode, use } from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { newSessionId } from './new-session';
import { isPage, sectionOf } from './sections';

// New Session, in the Project it was opened from when there is one: one route draws it and the Session it becomes.
export const newSessionHref = (projectId?: string): Href => ({
  pathname: '/sessions/[id]',
  params:
    projectId === undefined
      ? { id: newSessionId }
      : { id: newSessionId, projectId },
});

// A Session's page.
export const sessionHref = (id: string): Href => ({
  pathname: '/sessions/[id]',
  params: { id },
});

// Back to the Sessions list, as Back from a Session's page goes; a wide window then shows the list with no Session open.
export function leaveForSessions(): void {
  router.dismissTo('/sessions');
}

// A Project's page in Settings.
export const projectHref = (name: string): Href => ({
  pathname: '/settings/projects/[name]',
  params: { name },
});

interface NavigateOptions {
  // Swaps out the current page, so Back skips it.
  replace?: boolean;
}

export type Navigate = (href: Href, options?: NavigateOptions) => void;

const pathOf = (href: Href): string =>
  typeof href === 'string' ? href : (href.pathname ?? '');

interface Place {
  // The path of the page shown.
  shown: string;
  wide: boolean;
}

const samePageSection = (shown: string, next: string): boolean =>
  isPage(shown) && sectionOf(shown) === sectionOf(next);

// A wide window shows one page beside its section's list: another page of that section swaps out the shown one, so under it the stack keeps only the list for a narrow window's Back.
function swapsPage({ shown, wide }: Place, next: string): boolean {
  return wide && isPage(next) && samePageSection(shown, next);
}

interface NavigationState {
  index?: number;
  routes: readonly { state?: NavigationState }[];
}

type ContainerRef = ReturnType<typeof useNavigationContainerRef>;

// The route a stack shows: its focused one, or its last before it has an index.
function shownRoute(
  state: NavigationState,
): { state?: NavigationState } | undefined {
  return state.routes[state.index ?? state.routes.length - 1];
}

// How many pages the shown section's stack holds, its root included.
function shownStackDepth(state: NavigationState): number {
  const nested = shownRoute(state)?.state;

  return nested ? shownStackDepth(nested) : state.routes.length;
}

function paneStackDepth(container: ContainerRef): number {
  const root = container.current?.getRootState();

  return root ? shownStackDepth(root) : 0;
}

// The section's root and the page beside the list.
const paneDepth = 2;

/*
 * Swaps the shown page. A tablet's medium Settings pane pushes a page drilled into from its first page (#927), so
 * the swap first takes the pane back to that first page.
 */
function swapPage(href: Href, container: ContainerRef): void {
  const depth = paneStackDepth(container);

  if (depth > paneDepth) router.dismiss(depth - paneDepth);
  router.replace(href);
}

function go(href: Href, swaps: boolean, container: ContainerRef): void {
  if (swaps) swapPage(href, container);
  else router.navigate(href);
}

// Opens a page: pushed over the shown one on a narrow window, beside the list on a wide one.
export function useNavigate(): Navigate {
  const place = { shown: usePathname(), wide: useWide() };
  const container = useNavigationContainerRef();

  return (href, options) => {
    if (options?.replace) router.replace(href);
    else go(href, swapsPage(place, pathOf(href)), container);
  };
}

// The page a section opens at its root when its list sits beside the pages: a route of the section's stack, such as `accounts` or `[id]`, and that route's params.
export interface FirstPage {
  page: string;
  // Keep the object stable, since a new one opens the page again.
  params?: Record<string, string>;
}

/*
 * Asks to be told when the person tries to leave the page: a back swipe, Back, or a link.
 * While `active`, leaving waits for onBlocked, which calls `proceed` to let it go.
 */
export type LeaveGuard = (
  active: boolean,
  onBlocked: (proceed: () => void) => void,
) => void;

const noLeaveGuard: LeaveGuard = () => null;

// The router holds both native and JS removal, then dispatches the held action when allowed.
const useRouterLeaveGuard: LeaveGuard = (active, onBlocked) => {
  const navigation = useNavigation();

  usePreventRemove(active, ({ data }) => {
    onBlocked(() => navigation.dispatch(data.action));
  });
};

// Without the app's router, as in a story, nothing holds a page.
const LeaveGuardContext = createContext<LeaveGuard>(noLeaveGuard);

// Without the app's router, as in a story, every screen counts as focused.
const ScreenFocusContext = createContext<() => boolean>(() => true);

export interface NavigationProviderProps {
  children: ReactNode;
  // The router's own, unless a story holds the page itself.
  leaveGuard?: LeaveGuard;
}

// The app's pages hold their removal through the router.
export function NavigationProvider({
  children,
  leaveGuard = useRouterLeaveGuard,
}: NavigationProviderProps): React.JSX.Element {
  return (
    <ScreenFocusContext value={useIsFocused}>
      <LeaveGuardContext value={leaveGuard}>{children}</LeaveGuardContext>
    </ScreenFocusContext>
  );
}

export function useLeaveGuard(
  active: boolean,
  onBlocked: (proceed: () => void) => void,
): void {
  use(LeaveGuardContext)(active, onBlocked);
}

// Read at the consuming screen, whose navigator retains it when another section opens.
export function useScreenFocused(): boolean {
  return use(ScreenFocusContext)();
}
