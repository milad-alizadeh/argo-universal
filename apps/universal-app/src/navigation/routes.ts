import type { NavigationDestination } from '@repo/client';

// The route that draws each destination; a destination's fields are its route's params.
const routes = {
  sessions: '/',
  'new-session': '/sessions/new',
  session: '/sessions/[id]',
  issues: '/issues',
  atlas: '/atlas',
  settings: '/settings',
  'settings-projects': '/settings/projects',
  'settings-agents': '/settings/agents',
  'settings-accounts': '/settings/accounts',
  'settings-connection': '/settings/connection',
  'settings-project': '/settings/projects/[name]',
  'settings-agent': '/settings/agents/[agent]',
  'settings-devices': '/settings/devices',
  'settings-appearance': '/settings/appearance',
  'settings-notifications': '/settings/notifications',
} as const satisfies Record<NavigationDestination['to'], string>;

type Route = keyof typeof routes;

export function hrefFor({ to, ...params }: NavigationDestination): {
  pathname: (typeof routes)[Route];
  params: Omit<NavigationDestination, 'to'>;
} {
  return { pathname: routes[to], params };
}

// Reads the destination back from Expo Router's segments and params; any other route counts as the Sessions list.
export function destinationFor(
  segments: readonly string[],
  params: Record<string, string | string[] | undefined>,
): NavigationDestination {
  const route = `/${segments.filter((segment) => !segment.startsWith('(') && segment !== 'index').join('/')}`;
  const to =
    (Object.keys(routes) as Route[]).find((key) => routes[key] === route) ??
    'sessions';
  const names = routes[to].match(/(?<=\[)\w+(?=\])/g) ?? [];
  return Object.fromEntries([
    ['to', to],
    ...names.map((name) => [name, String(params[name])]),
  ]) as NavigationDestination;
}
