import { describe, expect, it } from 'vitest';
import type { NavigationDestination } from './context';
import { sectionDestination, sectionOf } from './sections';

const cases: [NavigationDestination, string][] = [
  [{ to: 'sessions' }, 'sessions'],
  [{ to: 'new-session' }, 'sessions'],
  [{ to: 'session', id: 'session-1' }, 'sessions'],
  [{ to: 'issues' }, 'issues'],
  [{ to: 'atlas' }, 'atlas'],
  [{ to: 'settings' }, 'settings'],
  [{ to: 'settings-accounts' }, 'settings'],
  [{ to: 'settings-connection' }, 'settings'],
  [{ to: 'settings-project', name: 'example-project' }, 'settings'],
  [{ to: 'settings-agent-new' }, 'settings'],
  [{ to: 'settings-agent', agent: 'first-agent' }, 'settings'],
];

describe('sectionOf', () => {
  it.each(cases)('puts %o in %s', (destination, section) => {
    expect(sectionOf(destination)).toBe(section);
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
