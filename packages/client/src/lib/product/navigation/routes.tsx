import type { NavigationDestination } from './context';

export { sectionDestination, sectionOrder } from './sections';

type NewSessionDestination = Extract<
  NavigationDestination,
  { to: 'new-session' }
>;

// A route's params, as Expo Router reads them.
type RouteParams = Record<string, string | string[] | undefined>;

// The Session id New Session's URL carries; Session ids are UUIDs, so none is ever this.
export const newSessionId = 'new';

// One route draws New Session and the Session it becomes, so the first prompt keeps the same screen.
const sessionOrNew = (params: RouteParams): NavigationDestination => {
  const id = String(params.id);

  return id === newSessionId ? newSession(params) : { to: 'session', id };
};

function newSession({ projectId }: RouteParams): NavigationDestination {
  const destination: NewSessionDestination = { to: 'new-session' };

  if (typeof projectId === 'string') destination.projectId = projectId;

  return destination;
}

interface Path<Pathname extends string> {
  pathname: Pathname;
  // The href to the route, with a destination's fields as its params.
  href: <Params>(params: Params) => { pathname: Pathname; params: Params };
}

function path<const Pathname extends string>(
  pathname: Pathname,
): Path<Pathname> {
  return { pathname, href: (params) => ({ pathname, params }) };
}

// The route that draws each destination; a destination's fields are its route's params.
const routes = {
  sessions: { ...path('/sessions'), destination: () => ({ to: 'sessions' }) },
  'new-session': {
    ...path('/sessions/[id]'),
    destination: sessionOrNew,
  },
  session: {
    ...path('/sessions/[id]'),
    destination: sessionOrNew,
  },
  issues: { ...path('/issues'), destination: () => ({ to: 'issues' }) },
  atlas: { ...path('/atlas'), destination: () => ({ to: 'atlas' }) },
  settings: { ...path('/settings'), destination: () => ({ to: 'settings' }) },
  'settings-projects': {
    ...path('/settings/projects'),
    destination: () => ({ to: 'settings-projects' }),
  },
  'settings-agents': {
    ...path('/settings/agents'),
    destination: () => ({ to: 'settings-agents' }),
  },
  'settings-accounts': {
    ...path('/settings/accounts'),
    destination: () => ({ to: 'settings-accounts' }),
  },
  'settings-connection': {
    ...path('/settings/connection'),
    destination: () => ({ to: 'settings-connection' }),
  },
  'settings-project': {
    ...path('/settings/projects/[name]'),
    destination: (params) => ({
      to: 'settings-project',
      name: String(params.name),
    }),
  },
  'settings-agent-new': {
    ...path('/settings/agents/new'),
    destination: () => ({ to: 'settings-agent-new' }),
  },
  'settings-agent': {
    ...path('/settings/agents/[agent]'),
    destination: (params) => ({
      to: 'settings-agent',
      agent: String(params.agent),
    }),
  },
  'settings-devices': {
    ...path('/settings/devices'),
    destination: () => ({ to: 'settings-devices' }),
  },
  'settings-appearance': {
    ...path('/settings/appearance'),
    destination: () => ({ to: 'settings-appearance' }),
  },
  'settings-notifications': {
    ...path('/settings/notifications'),
    destination: () => ({ to: 'settings-notifications' }),
  },
} as const satisfies Record<
  NavigationDestination['to'],
  Path<string> & {
    destination: (params: RouteParams) => NavigationDestination;
  }
>;

// Each destination's fields, keyed by where it goes: they become its route's params.
type DestinationFields = {
  [Destination in NavigationDestination as Destination['to']]: Omit<
    Destination,
    'to'
  >;
};

type To = keyof DestinationFields;

// Each destination's href, so a route's path keeps the params it needs.
type Hrefs = {
  [Key in To]: {
    pathname: (typeof routes)[Key]['pathname'];
    params: DestinationFields[Key];
  };
};

type NewSessionHref = {
  pathname: Hrefs['new-session']['pathname'];
  params: DestinationFields['new-session'] & { id: typeof newSessionId };
};

type RouteHref = Hrefs[Exclude<To, 'new-session'>] | NewSessionHref;

// Typed per key, so indexing by a generic `to` keeps each path with its own params.
type HrefBuilders = {
  [Key in To]: { href: (params: DestinationFields[Key]) => Hrefs[Key] };
};

const hrefs: HrefBuilders = routes;

function routeHref<Key extends To>(
  to: Key,
  params: DestinationFields[Key],
): Hrefs[Key] {
  return hrefs[to].href(params);
}

export function hrefFor(destination: NavigationDestination): RouteHref {
  if (destination.to === 'new-session') return newSessionHref(destination);
  const { to, ...params } = destination;

  return routeHref(to, params);
}

// New Session's URL is a Session's, with an id no Session has.
function newSessionHref(destination: NewSessionDestination): NewSessionHref {
  const { to, ...params } = destination;

  return {
    pathname: routes[to].pathname,
    params: { ...params, id: newSessionId },
  };
}

// Reads the destination back from Expo Router's segments and params; any other route counts as the Sessions list.
export function destinationFor(
  segments: readonly string[],
  params: Record<string, string | string[] | undefined>,
): NavigationDestination {
  const route = `/${segments.filter((segment) => !segment.startsWith('(') && segment !== 'index').join('/')}`;

  const matched = Object.values(routes).find(
    ({ pathname }) => pathname === route,
  );

  return matched?.destination(params) ?? { to: 'sessions' };
}
