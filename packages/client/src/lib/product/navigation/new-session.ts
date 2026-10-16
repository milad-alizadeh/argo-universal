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

const showsNewSession = ({ params }: PageRoute): boolean =>
  params !== undefined && 'id' in params && params.id === newSessionId;

// A section's pages without New Session, or undefined when it has none; dropping the page closes its empty Session.
export function withoutNewSession<Route extends PageRoute>(
  pages: Pages<Route>,
): Pages<Route> | undefined {
  const routes = pages.routes.filter((route) => !showsNewSession(route));

  if (routes.length === pages.routes.length) return undefined;

  return { routes, index: Math.min(pages.index, routes.length - 1) };
}
