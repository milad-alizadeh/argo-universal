import { describe, expect, it } from 'vitest';
import type { NavigationDestination } from './context';
import { destinationTitle, sectionDestination, sectionOf } from './sections';

const cases: [NavigationDestination, string, string][] = [
  [{ to: 'sessions' }, 'sessions', 'Sessions'],
  [{ to: 'new-session' }, 'sessions', 'New Session'],
  [{ to: 'session', id: 'session-1' }, 'sessions', 'Session'],
  [{ to: 'issues' }, 'issues', 'Issues'],
  [{ to: 'atlas' }, 'atlas', 'Atlas'],
  [{ to: 'settings' }, 'settings', 'Settings'],
  [{ to: 'settings-accounts' }, 'settings', 'Accounts'],
  [{ to: 'settings-connection' }, 'settings', 'Connection'],
  [
    { to: 'settings-project', name: 'example-project' },
    'settings',
    'example-project',
  ],
  [{ to: 'settings-agent-new' }, 'settings', 'Add custom Agent'],
  [{ to: 'settings-agent', agent: 'first-agent' }, 'settings', 'first-agent'],
];

describe('sectionOf', () => {
  it.each(cases)('puts %o in %s', (destination, section) => {
    expect(sectionOf(destination)).toBe(section);
  });
});

describe('destinationTitle', () => {
  it.each(cases)('names %o', (destination, _section, title) => {
    expect(destinationTitle(destination)).toBe(title);
  });
});

describe('sectionDestination', () => {
  it.each(['sessions', 'issues', 'atlas', 'settings'] as const)(
    'opens %s on its list',
    (section) => {
      expect(sectionDestination(section)).toEqual({ to: section });
    },
  );
});
