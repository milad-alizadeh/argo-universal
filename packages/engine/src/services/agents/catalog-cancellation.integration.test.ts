import { agents } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { afterEach, expect, it, vi, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startRouterTestHost } from '#mocks/router';
import type { FetchAgents } from './index';

afterEach(() => vi.useRealTimers());

it.each(['timeout', 'shutdown'] as const)(
  'ignores a late Registry response after %s',
  async (reason): Promise<void> => {
    vi.useFakeTimers();
    const response = Promise.withResolvers<unknown>();
    const fetchAgents = vi.fn<FetchAgents>(() => response.promise);
    const shutdown = new AbortController();
    const stored = openTestDatabase();
    onTestFinished(stored.remove);
    const { caller, context, stop } = startRouterTestHost({
      database: stored.database, fetchAgents,
      sessionCommandSignal: shutdown.signal,
    });
    const synchronization = caller.agents.syncCatalog();
    await vi.advanceTimersByTimeAsync(0);
    if (reason === 'timeout') await vi.advanceTimersByTimeAsync(20_000);
    else await stop();
    expect(await synchronization).toMatchObject({
      changedIds: [],
      error: expect.stringMatching(/20 seconds|cancelled/),
    });
    expect(fetchAgents.mock.calls[0]?.[0].aborted).toBe(true);
    response.resolve(publishedRegistry);
    await vi.advanceTimersByTimeAsync(0);
    expect(context.database.select().from(agents).all()).toEqual([]);
  },
);

it('does not start a Registry read after Server shutdown admission closes', async (): Promise<void> => {
  const fetchAgents = vi.fn<FetchAgents>(async () => publishedRegistry);
  const shutdown = new AbortController();
  shutdown.abort();
  const { caller } = startRouterTestHost({
    fetchAgents,
    sessionCommandSignal: shutdown.signal,
  });
  await expect(caller.agents.syncCatalog()).rejects.toThrow();
  expect(fetchAgents).not.toHaveBeenCalled();
});
