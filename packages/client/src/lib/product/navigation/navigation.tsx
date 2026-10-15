import {
  type Href,
  router,
  useFocusEffect,
  useNavigation,
  usePathname,
} from 'expo-router';
import { CommonActions } from 'expo-router/react-navigation';
import type * as React from 'react';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
} from 'react';
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

// An Agent's page in Settings.
export const agentHref = (agent: string): Href => ({
  pathname: '/settings/agents/[agent]',
  params: { agent },
});

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

// Whether opening `next` swaps out the shown page rather than going over it.
const replaces = (
  place: Place,
  next: Href,
  options?: NavigateOptions,
): boolean => options?.replace === true || swapsPage(place, pathOf(next));

// Opens a page: pushed over the shown one on a narrow window, beside the list on a wide one.
export function useNavigate(): Navigate {
  const place = { shown: usePathname(), wide: useWide() };

  return (href, options) => {
    if (replaces(place, href, options)) router.replace(href);
    else router.navigate(href);
  };
}

export interface OpenFirstPageProps {
  // The section stack's route to open, such as `accounts` or `[id]`.
  page: string;
  // That route's params; keep the object stable, since a new one opens the page again.
  params?: Record<string, string>;
}

// On a wide window the list sits beside the pages, so a section's index opens its first page and the URL names the page shown; the list stays below it for a narrow window's Back.
export function OpenFirstPage({ page, params }: OpenFirstPageProps): null {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [{ name: 'index' }, { name: page, params }],
        }),
      );
    }, [navigation, page, params]),
  );

  return null;
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

// The router's beforeRemove holds the page, and carries on when told to.
const useRouterLeaveGuard: LeaveGuard = (active, onBlocked) => {
  const navigation = useNavigation();

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (!active) return;
        event.preventDefault();
        onBlocked(() => navigation.dispatch(event.data.action));
      }),
    [navigation, active, onBlocked],
  );
};

// Without the app's router, as in a story, nothing holds a page.
const LeaveGuardContext = createContext<LeaveGuard>(noLeaveGuard);

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
  return <LeaveGuardContext value={leaveGuard}>{children}</LeaveGuardContext>;
}

export function useLeaveGuard(
  active: boolean,
  onBlocked: (proceed: () => void) => void,
): void {
  use(LeaveGuardContext)(active, onBlocked);
}
