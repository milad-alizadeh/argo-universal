import { describe, expect, it } from 'vitest';
import { createCoalescedRefetch } from './coalesced-refetch';

// A refetch that finishes only when the test releases it.
function heldRefetch(): {
  refetch: () => Promise<void>;
  calls: () => number;
  release: () => Promise<void>;
} {
  let count = 0;
  let resolvers: (() => void)[] = [];
  return {
    refetch: () =>
      new Promise<void>((resolve) => {
        count += 1;
        resolvers.push(resolve);
      }),
    calls: () => count,
    release: async () => {
      const current = resolvers;
      resolvers = [];
      for (const resolve of current) resolve();
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

describe('createCoalescedRefetch', () => {
  it('refetches once for a single update', async () => {
    const held = heldRefetch();
    createCoalescedRefetch(held.refetch)();
    expect(held.calls()).toBe(1);
    await held.release();
    expect(held.calls()).toBe(1);
  });

  it('turns a burst during a refetch into one trailing refetch', async () => {
    const held = heldRefetch();
    const refetch = createCoalescedRefetch(held.refetch);
    refetch();
    for (let index = 0; index < 30; index++) refetch();
    expect(held.calls()).toBe(1);
    await held.release();
    expect(held.calls()).toBe(2);
    await held.release();
    expect(held.calls()).toBe(2);
  });

  it('starts a new refetch for an update after the last one finished', async () => {
    const held = heldRefetch();
    const refetch = createCoalescedRefetch(held.refetch);
    refetch();
    await held.release();
    refetch();
    expect(held.calls()).toBe(2);
  });
});
