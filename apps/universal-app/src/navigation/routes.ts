import type { NavigationDestination } from '@repo/client';

// The route that draws each destination; a destination's fields are its route's params.
type RouteParams = Record<string, string | string[] | undefined>;

const routes = {
  sessions: { pathname: '/', destination: () => ({ to: 'sessions' }) },
  'new-session': {
    pathname: '/sessions/new',
    destination: () => ({ to: 'new-session' }),
  },
  session: {
    pathname: '/sessions/[id]',
    destination: (params) => ({ to: 'session', id: String(params.id) }),
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
    destination: () => ({ to: 'settings-agents' }),
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

type Route = keyof typeof routes;

export function hrefFor({ to, ...params }: NavigationDestination): {
  pathname: (typeof routes)[Route]['pathname'];
  params: Omit<NavigationDestination, 'to'>;
} {
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
