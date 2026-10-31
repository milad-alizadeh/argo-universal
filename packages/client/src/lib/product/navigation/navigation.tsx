import { useWide } from '@repo/kit/use-wide/use-wide';
import {
  type Href,
  router,
  useIsFocused,
  useNavigation,
  usePathname,
} from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import type * as React from 'react';
import { createContext, type ReactNode, use } from 'react';
import { newSessionId } from './new-session';
import { isPage, sectionOf } from './sections';

// New Session, in the Project it was opened from when there is one, with a draft a Plugin hands it: one route draws it and the Session it becomes.
type NewSessionParams = { id: string; projectId?: string; draft?: string };

export function newSessionHref(projectId?: string, draft?: string): Href {
  const params: NewSessionParams = { id: newSessionId };

  if (projectId !== undefined) params.projectId = projectId;

  // useLocalSearchParams decodes every param once more, so a draft with `%2F` in it would arrive as `/`.
  if (draft !== undefined) params.draft = encodeURIComponent(draft);

  return { pathname: '/sessions/[id]', params };
}

// A Session's page.
export const sessionHref = (id: string): Href => ({
  pathname: '/sessions/[id]',
  params: { id },
});

// Back to the Sessions list, as Back from a Session's page goes; a wide window then shows the list with no Session open.
export function leaveForSessions(): void {
  router.dismissTo('/sessions');
}

// Sessions from a page no route answers: nothing is under it to go back to, so the list replaces it.
export function replaceWithSessions(): void {
  router.replace('/sessions');
}

// A Project's page in Settings.
export const projectHref = (name: string): Href => ({
  pathname: '/settings/projects/[name]',
  params: { name },
});

// A Slot's page in Settings › Plugins; a Slot id has slashes, so it travels as one param.
export const slotDetailHref = (id: string): Href => ({
  pathname: '/settings/plugins/slots/[id]',
  params: { id },
});

interface NavigateOptions {
  // Swaps out the current page, so Back skips it.
  replace?: boolean;
  // Opens the section's root list under the page when the section has no stack yet, so the page has a Back and ☰ and the section opens at its list later.
  withAnchor?: boolean;
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

function go(href: Href, place: Place, options: NavigateOptions): void {
  if (options.replace || swapsPage(place, pathOf(href))) router.replace(href);
  else router.navigate(href, { withAnchor: options.withAnchor });
}

// Opens a page: pushed over the shown one on a narrow window, beside the list on a wide one.
export function useNavigate(): Navigate {
  const place = { shown: usePathname(), wide: useWide() };

  return (href, options) => go(href, place, options ?? {});
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
type LeaveGuard = (
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

// Read at the consuming screen, whose navigator retains it when another section opens.
export function useScreenFocused(): boolean {
  return use(ScreenFocusContext)();
}
