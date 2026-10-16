import { expect, it } from 'vitest';
import { notificationSessionAt } from './session-at-path';

it.each([
  ['/sessions/session-a', 'session-a'],
  ['/sessions/session-b/', 'session-b'],
  ['/sessions/new', null],
  ['/sessions', null],
  ['/settings/accounts', null],
])('reports the Session for %s', (path, expected) => {
  expect(notificationSessionAt(path)).toBe(expected);
});
