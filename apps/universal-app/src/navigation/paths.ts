import type { NavigationDestination } from '@repo/client';

// The URL of every destination, as spec 0003 "App layout and navigation" lists them.
export function pathFor(destination: NavigationDestination): string {
  switch (destination.to) {
    case 'sessions':
      return '/';
    case 'new-session':
      return '/sessions/new';
    case 'session':
      return `/sessions/${encodeURIComponent(destination.id)}`;
    case 'issues':
      return '/issues';
    case 'atlas':
      return '/atlas';
    case 'settings':
      return '/settings';
    case 'settings-accounts':
      return '/settings/accounts';
    case 'settings-connection':
      return '/settings/connection';
    case 'settings-project':
      return `/settings/projects/${encodeURIComponent(destination.name)}`;
    case 'settings-agent':
      return `/settings/agents/${encodeURIComponent(destination.agent)}`;
  }
}

export function destinationFor(
  path: string,
): NavigationDestination | undefined {
  const segments = path
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
  const [first, second, third, ...rest] = segments;
  if (rest.length) return undefined;
  if (first === undefined) return { to: 'sessions' };
  if (first === 'issues' && second === undefined) return { to: 'issues' };
  if (first === 'atlas' && second === undefined) return { to: 'atlas' };
  if (first === 'sessions' && second !== undefined && third === undefined)
    return second === 'new'
      ? { to: 'new-session' }
      : { to: 'session', id: second };
  if (first !== 'settings') return undefined;
  if (second === undefined) return { to: 'settings' };
  if (third === undefined) {
    if (second === 'accounts') return { to: 'settings-accounts' };
    if (second === 'connection') return { to: 'settings-connection' };
    return undefined;
  }
  if (second === 'projects') return { to: 'settings-project', name: third };
  if (second === 'agents') return { to: 'settings-agent', agent: third };
  return undefined;
}
