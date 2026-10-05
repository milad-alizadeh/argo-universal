import type { NavigationDestination } from '@repo/client';
import { describe, expect, it } from 'vitest';
import { destinationFor, pathFor } from './paths';

const destinations: [NavigationDestination, string][] = [
  [{ to: 'sessions' }, '/'],
  [{ to: 'new-session' }, '/sessions/new'],
  [{ to: 'session', id: 'session-1' }, '/sessions/session-1'],
  [{ to: 'issues' }, '/issues'],
  [{ to: 'atlas' }, '/atlas'],
  [{ to: 'settings' }, '/settings'],
  [{ to: 'settings-accounts' }, '/settings/accounts'],
  [{ to: 'settings-connection' }, '/settings/connection'],
  [
    { to: 'settings-project', name: 'example project' },
    '/settings/projects/example%20project',
  ],
  [
    { to: 'settings-agent', agent: 'first-agent' },
    '/settings/agents/first-agent',
  ],
];

describe('pathFor', () => {
  it.each(destinations)('gives %o the URL %s', (destination, path) => {
    expect(pathFor(destination)).toBe(path);
  });
});

describe('destinationFor', () => {
  it.each(destinations)('reads %o back from %s', (destination, path) => {
    expect(destinationFor(path)).toEqual(destination);
  });

  it('reads a decoded path too', () => {
    expect(destinationFor('/settings/projects/example project')).toEqual({
      to: 'settings-project',
      name: 'example project',
    });
  });

  it('ignores a trailing slash', () => {
    expect(destinationFor('/settings/')).toEqual({ to: 'settings' });
  });

  it('gives nothing for an unknown URL', () => {
    expect(destinationFor('/unknown')).toBeUndefined();
    expect(destinationFor('/sessions/one/two')).toBeUndefined();
  });
});
