// The Session id New Session's URL carries; Session ids are UUIDs, so none is ever this.
export const newSessionId = 'new';

interface PageRoute {
  name: string;
  params?: object;
}

interface Pages<Route extends PageRoute> {
  index: number;
  routes: Route[];
}

// Expo Router names a route after its file, so the Session's page is `[id]` and the section's list is `index`.
const sessionPage = '[id]';

const carriesNewSessionId = ({ params }: PageRoute): boolean =>
  params !== undefined && 'id' in params && params.id === newSessionId;

/*
 * Only the Session's own page shows New Session: opening its URL builds the list below it from the
 * same path, so the list carries the page's params too and the id alone names both.
 */
const showsNewSession = (route: PageRoute): boolean =>
  route.name === sessionPage && carriesNewSessionId(route);

const withoutId = ({ params }: PageRoute): object =>
  Object.fromEntries(
    Object.entries(params ?? {}).filter(([name]) => name !== 'id'),
  );

// The closed Session's id leaves with its page, so no page under it keeps it in the Frame's URL.
const dropsNewSessionId = <Route extends PageRoute>(route: Route): Route =>
  carriesNewSessionId(route) ? { ...route, params: withoutId(route) } : route;

/*
 * A section's pages without New Session, or undefined when there is none to drop and when dropping it
 * would leave the section with no page to show; dropping the page closes its empty Session.
 */
export function withoutNewSession<Route extends PageRoute>(
  pages: Pages<Route>,
): Pages<Route> | undefined {
  const below = pages.routes.filter((route) => !showsNewSession(route));

  if (below.length === pages.routes.length || below.length === 0)
    return undefined;

  const routes = below.map(dropsNewSessionId);

  return { routes, index: Math.min(pages.index, routes.length - 1) };
}
