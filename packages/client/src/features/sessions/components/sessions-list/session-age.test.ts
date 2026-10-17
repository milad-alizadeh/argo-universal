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
  it.each([
    { order: 'activity', age: '5m' },
    // The age counts from the time the list sorts by, so the ages run in its order.
    { order: 'created', age: '2h' },
  ] as const)('reads $age in the $order order', ({ order, age }) => {
    expect(sessionAge(session, now, order)).toBe(age);
  });

  it('reads no age while the list shows none', () => {
    expect(sessionAge(session, undefined, 'created')).toBeUndefined();
  });
});
