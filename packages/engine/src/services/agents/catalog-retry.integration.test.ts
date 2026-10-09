import { afterEach, expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { RegistryHttpError } from './catalog/fetch-agents';

afterEach(() => vi.useRealTimers());
it.each([
  { status: 404, attempts: 1 },
  { status: 503, attempts: 3 },
])(
  'makes $attempts attempts after HTTP $status and exposes the failure from SQL',
  async ({ status, attempts }) => {
    const fetchAgents = vi.fn<() => Promise<unknown>>(async () => {
      throw new RegistryHttpError(status);
    });
    const host = await startEngineTestHost({ fetchAgents });
    vi.useFakeTimers();
    await host.caller.agents.syncCatalog();
    await vi.advanceTimersByTimeAsync(3000);
    expect(fetchAgents).toHaveBeenCalledTimes(attempts);
    expect(await host.caller.agents.catalog()).toMatchObject({
      syncStatus: 'failed',
      error: `Registry returned HTTP ${status}`,
      fetchedAt: null,
      agents: [],
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchAgents).toHaveBeenCalledTimes(attempts);
  },
);
