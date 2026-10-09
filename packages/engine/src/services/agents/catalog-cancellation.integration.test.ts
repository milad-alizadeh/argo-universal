import { agents } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { afterEach, expect, it, vi, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import type { FetchAgents } from './index';

afterEach(() => vi.useRealTimers());

it.each(['timeout', 'shutdown'] as const)(
  'ignores a late Registry response after %s',
  async (reason): Promise<void> => {
    const response = Promise.withResolvers<unknown>();
    const fetchAgents = vi.fn<FetchAgents>(() => response.promise);
    const stored = openTestDatabase();
    onTestFinished(stored.remove);
    const { caller, stop } = await startEngineTestHost({
      fetchAgents,
      database: stored.database,
    });
    vi.useFakeTimers();
    const synchronization = caller.agents.syncCatalog();
    await vi.advanceTimersByTimeAsync(0);
    await (reason === 'timeout' ? vi.advanceTimersByTimeAsync(20_000) : stop());
    expect(await synchronization).toMatchObject({
      changedIds: [],
      error: expect.stringMatching(/20 seconds|cancelled/),
    });
    expect(fetchAgents.mock.calls[0]?.[0].aborted).toBe(true);
    response.resolve(publishedRegistry);
    await vi.advanceTimersByTimeAsync(0);
    expect(stored.database.select().from(agents).all()).toEqual([]);
  },
);

it('does not start a Registry read after Server shutdown admission closes', async (): Promise<void> => {
  const fetchAgents = vi.fn<FetchAgents>(async () => publishedRegistry);
  const { caller, stop } = await startEngineTestHost({ fetchAgents });
  await stop();
  expect(await caller.agents.syncCatalog()).toMatchObject({
    error: 'Registry sync was cancelled',
  });
  expect(fetchAgents).not.toHaveBeenCalled();
});
