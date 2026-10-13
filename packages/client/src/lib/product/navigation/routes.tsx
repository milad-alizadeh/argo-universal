import type { NavigationDestination } from './context';

type RouteHref = {
  [Key in NavigationDestination['to']]: {
    pathname: (typeof routes)[Key]['pathname'];
    params: Omit<Extract<NavigationDestination, { to: Key }>, 'to'> &
      (Key extends 'new-session' ? { id: typeof newSessionId } : unknown);
  };
}[NavigationDestination['to']];

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
  return {
    to: 'new-session',
    ...(typeof projectId === 'string' ? { projectId } : {}),
  };
}

function agentsList({ filter }: RouteParams): NavigationDestination {
  return {
    to: 'settings-agents',
    ...(filter === 'not-installed' ? { filter } : {}),
  };
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
  if (destination.to === 'session') return sessionHref(destination);
  if (destination.to === 'new-session') return newSessionHref(destination);
  return settingsOrStaticHref(destination);
}

function settingsOrStaticHref(
  destination: Exclude<
    NavigationDestination,
    { to: 'session' | 'new-session' }
  >,
): RouteHref {
  if (destination.to === 'settings-project') return projectHref(destination);
  if (destination.to === 'settings-agent') return agentHref(destination);
  const { to, ...params } = destination;
  return { pathname: routes[to].pathname, params };
}

function sessionHref(
  destination: Extract<NavigationDestination, { to: 'session' }>,
): RouteHref {
  const { to, ...params } = destination;
  return { pathname: routes[to].pathname, params };
}

// New Session's URL is a Session's, with an id no Session has.
function newSessionHref(
  destination: Extract<NavigationDestination, { to: 'new-session' }>,
): RouteHref {
  const { to, ...params } = destination;
  return {
    pathname: routes[to].pathname,
    params: { ...params, id: newSessionId },
  };
}

function projectHref(
  destination: Extract<NavigationDestination, { to: 'settings-project' }>,
): RouteHref {
  const { to, ...params } = destination;
  return { pathname: routes[to].pathname, params };
}

function agentHref(
  destination: Extract<NavigationDestination, { to: 'settings-agent' }>,
): RouteHref {
  const { to, ...params } = destination;
  return { pathname: routes[to].pathname, params };
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
