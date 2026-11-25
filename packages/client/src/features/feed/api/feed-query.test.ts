import { expect, it } from 'vitest';
import { feedKey, sessionIdOf, snapshotKey } from './feed-query';

it('names the Session a Feed or snapshot key belongs to', () => {
  expect(sessionIdOf(feedKey('session-1'))).toBe('session-1');
  expect(sessionIdOf(snapshotKey('session-2'))).toBe('session-2');
});
