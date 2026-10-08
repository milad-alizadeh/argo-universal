import type { NavigationDestination } from '@repo/client';
import { describe, expect, it } from 'vitest';
import { destinationFor, hrefFor } from './routes';

const sessionsRouteGroup = '(sessions)';
const firstAgentId = 'first-agent';

const destinations: [NavigationDestination, string[], object][] = [
  [{ to: 'sessions' }, ['(shell)', sessionsRouteGroup], {}],
  [
    { to: 'new-session' },
    ['(shell)', sessionsRouteGroup, 'sessions', 'new'],
    {},
  ],
  [
    { to: 'session', id: 'session-1' },
    ['(shell)', sessionsRouteGroup, 'sessions', '[id]'],
    {},
  ],
  [{ to: 'issues' }, ['(shell)', 'issues', 'index'], {}],
  [{ to: 'atlas' }, ['(shell)', 'atlas', 'index'], {}],
  [{ to: 'settings' }, ['(shell)', 'settings', 'index'], {}],
  [
    { to: 'settings-projects' },
    ['(shell)', 'settings', 'projects', 'index'],
    {},
  ],
  [{ to: 'settings-agents' }, ['(shell)', 'settings', 'agents', 'index'], {}],
  [{ to: 'settings-accounts' }, ['(shell)', 'settings', 'accounts'], {}],
  [{ to: 'settings-devices' }, ['(shell)', 'settings', 'devices'], {}],
  [{ to: 'settings-appearance' }, ['(shell)', 'settings', 'appearance'], {}],
  [
    { to: 'settings-notifications' },
    ['(shell)', 'settings', 'notifications'],
    {},
  ],
  [{ to: 'settings-connection' }, ['(shell)', 'settings', 'connection'], {}],
  [
    { to: 'settings-project', name: 'example project' },
    ['(shell)', 'settings', 'projects', '[name]'],
    {},
  ],
  [
    { to: 'settings-agent', agent: firstAgentId },
    ['(shell)', 'settings', 'agents', '[agent]'],
    {},
  ],
];

describe('hrefFor', () => {
  it('gives each destination its route and params', () => {
    expect(hrefFor({ to: 'sessions' })).toEqual({ pathname: '/', params: {} });
    expect(hrefFor({ to: 'session', id: 'session-1' })).toEqual({
      pathname: '/sessions/[id]',
      params: { id: 'session-1' },
    });
    expect(hrefFor({ to: 'settings-agent', agent: firstAgentId })).toEqual({
      pathname: '/settings/agents/[agent]',
      params: { agent: firstAgentId },
    });
  });
});

describe('destinationFor', () => {
  it.each(destinations)('reads %o from its route', (destination, segments) => {
    const { to: _to, ...params } = destination;
    expect(destinationFor(segments, params)).toEqual(destination);
  });

  it('keeps only the params its route names', () => {
    expect(
      destinationFor(['(shell)', sessionsRouteGroup, 'sessions', '[id]'], {
        id: 'session-1',
        tab: 'feed',
      }),
    ).toEqual({ to: 'session', id: 'session-1' });
  });

  it('reads the Sessions list for a route outside the table', () => {
    expect(destinationFor(['(dev)', 'storybook'], {})).toEqual({
      to: 'sessions',
    });
  });
});
