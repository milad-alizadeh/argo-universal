import type { NavigationDestination } from './context';

type NewSessionDestination = Extract<
  NavigationDestination,
  { to: 'new-session' }
>;

type AgentsDestination = Extract<
  NavigationDestination,
  { to: 'settings-agents' }
>;

// A destination's fields without `to`: they become its route's params.
type DestinationFields<Destination> = Destination extends NavigationDestination
  ? Omit<Destination, 'to'>
  : never;

interface RouteHref {
  pathname: (typeof routes)[NavigationDestination['to']]['pathname'];
  params:
    | DestinationFields<NavigationDestination>
    | (DestinationFields<NewSessionDestination> & { id: typeof newSessionId });
}

// The route that draws each destination; a destination's fields are its route's params.
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

function agentsList({ filter }: RouteParams): NavigationDestination {
  const destination: AgentsDestination = { to: 'settings-agents' };

  if (filter === 'not-installed') destination.filter = filter;

  return destination;
}

const routes = {
  sessions: { pathname: '/', destination: () => ({ to: 'sessions' }) },
  'new-session': {
    pathname: '/sessions/[id]',
    destination: sessionOrNew,
  },
  session: {
    pathname: '/sessions/[id]',
    destination: sessionOrNew,
  },
  issues: { pathname: '/issues', destination: () => ({ to: 'issues' }) },
  atlas: { pathname: '/atlas', destination: () => ({ to: 'atlas' }) },
  settings: { pathname: '/settings', destination: () => ({ to: 'settings' }) },
  'settings-projects': {
    pathname: '/settings/projects',
    destination: () => ({ to: 'settings-projects' }),
  },
  'settings-agents': {
    pathname: '/settings/agents',
    destination: agentsList,
  },
  'settings-accounts': {
    pathname: '/settings/accounts',
    destination: () => ({ to: 'settings-accounts' }),
  },
  'settings-connection': {
    pathname: '/settings/connection',
    destination: () => ({ to: 'settings-connection' }),
  },
  'settings-project': {
    pathname: '/settings/projects/[name]',
    destination: (params) => ({
      to: 'settings-project',
      name: String(params.name),
    }),
  },
  'settings-agent-new': {
    pathname: '/settings/agents/new',
    destination: () => ({ to: 'settings-agent-new' }),
  },
  'settings-agent': {
    pathname: '/settings/agents/[agent]',
    destination: (params) => ({
      to: 'settings-agent',
      agent: String(params.agent),
    }),
  },
  'settings-devices': {
    pathname: '/settings/devices',
    destination: () => ({ to: 'settings-devices' }),
  },
  'settings-appearance': {
    pathname: '/settings/appearance',
    destination: () => ({ to: 'settings-appearance' }),
  },
  'settings-notifications': {
    pathname: '/settings/notifications',
    destination: () => ({ to: 'settings-notifications' }),
  },
} as const satisfies Record<
  NavigationDestination['to'],
  {
    pathname: string;
    destination: (params: RouteParams) => NavigationDestination;
  }
>;

export function hrefFor(destination: NavigationDestination): RouteHref {
  if (destination.to === 'new-session') return newSessionHref(destination);
  const { to, ...params } = destination;

  return { pathname: routes[to].pathname, params };
}

// New Session's URL is a Session's, with an id no Session has.
function newSessionHref(destination: NewSessionDestination): RouteHref {
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
