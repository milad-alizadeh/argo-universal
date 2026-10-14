import type { NavigationDestination } from '@repo/client';
import { newSessionId } from '@repo/client/navigation';
import { describe, expect, it } from 'vitest';
import { destinationFor, hrefFor } from './routes';

const sessionsRouteGroup = '(sessions)';

const firstAgentId = 'first-agent';

const newSessionInProject: NavigationDestination = {
  to: 'new-session',
  projectId: 'project-1',
};

const destinations: [
  NavigationDestination,
  string[],
  Record<string, string>,
][] = [
  [{ to: 'sessions' }, ['(shell)', sessionsRouteGroup], {}],
  [
    { to: 'new-session' },
    ['(shell)', sessionsRouteGroup, 'sessions', '[id]'],
    { id: newSessionId },
  ],
  [
    newSessionInProject,
    ['(shell)', sessionsRouteGroup, 'sessions', '[id]'],
    { projectId: 'project-1', id: newSessionId },
  ],
  [
    { to: 'session', id: 'session-1' },
    ['(shell)', sessionsRouteGroup, 'sessions', '[id]'],
    { id: 'session-1' },
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
  [
    { to: 'settings-agents', filter: 'not-installed' },
    ['(shell)', 'settings', 'agents', 'index'],
    { filter: 'not-installed' },
  ],
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
    { name: 'example project' },
  ],
  [{ to: 'settings-agent-new' }, ['(shell)', 'settings', 'agents', 'new'], {}],
  [
    { to: 'settings-agent', agent: firstAgentId },
    ['(shell)', 'settings', 'agents', '[agent]'],
    { agent: firstAgentId },
  ],
];

describe('hrefFor', () => {
  it('gives each destination its route and params', () => {
    expect(hrefFor({ to: 'sessions' })).toEqual({ pathname: '/', params: {} });
    expect(hrefFor({ to: 'session', id: 'session-1' })).toEqual({
      pathname: '/sessions/[id]',
      params: { id: 'session-1' },
    });
    expect(hrefFor(newSessionInProject)).toEqual({
      pathname: '/sessions/[id]',
      params: { projectId: 'project-1', id: newSessionId },
    });
    expect(hrefFor({ to: 'settings-agent', agent: firstAgentId })).toEqual({
      pathname: '/settings/agents/[agent]',
      params: { agent: firstAgentId },
    });
  });
});

describe('destinationFor', () => {
  it.each(destinations)(
    'reads %o from its route',
    (destination, segments, params) => {
      expect(destinationFor(segments, params)).toEqual(destination);
    },
  );

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
