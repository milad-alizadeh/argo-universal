import { sessionRows } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import { sessionAge } from './session-age';

const minute = 60 * 1000;

const hour = 60 * minute;

const now = 10 * hour;

// Created two hours ago, last active five minutes ago.
const session = {
  ...sessionRows.idle,
  createdAt: now - 2 * hour,
  activityAt: now - 5 * minute,
};

describe('how old a One list row reads', () => {
  // The age counts from the last activity the list sorts by, not from creation, so the ages run in its order.
  it('reads the time since its last activity', () => {
    expect(sessionAge(session, now)).toBe('5m');
  });

  it('reads no age while the list shows none', () => {
    expect(sessionAge(session)).toBeUndefined();
  });
});
