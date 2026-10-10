import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { afterEach, expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { RegistryHttpError } from './catalog/fetch-agents';

const offlineMessage = 'Registry offline';
afterEach(() => vi.useRealTimers());

it('keeps the last completed error visible while a retry is pending', async () => {
  const response = Promise.withResolvers<unknown>();
  const fetchAgents = vi
    .fn<() => Promise<unknown>>()
    .mockResolvedValueOnce(publishedRegistry)
    .mockRejectedValueOnce(new Error(offlineMessage))
    .mockImplementation(() => response.promise);
  const host = await startEngineTestHost({ fetchAgents });
  await host.caller.agents.syncCatalog();
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .toBe('idle');
  await host.caller.agents.syncCatalog();
  await expect
    .poll(async () => (await host.caller.agents.catalog()).error)
    .toBe(offlineMessage);
  const accepted = await host.caller.agents.catalog();
  expect(accepted).toMatchObject({
    status: 'stale',
    error: offlineMessage,
  });
  const retry = host.caller.agents.syncCatalog();
  try {
    await vi.waitFor(() => expect(fetchAgents).toHaveBeenCalledTimes(3), {
      timeout: 2000,
    });
    expect(await host.caller.agents.catalog()).toMatchObject({
      error: accepted.error,
      fetchedAt: accepted.fetchedAt,
      agents: accepted.agents,
    });
  } finally {
    response.resolve(publishedRegistry);
    await retry;
  }
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .toBe('idle');
  expect(await host.caller.agents.catalog()).toMatchObject({
    status: 'fresh',
    error: null,
  });
});

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

it('records a successful empty catalog and retains that accepted result through a failed Refresh', async (): Promise<void> => {
  let offline = false;
  const { caller } = await startEngineTestHost({
    fetchAgents: async () => {
      if (offline) throw new Error('Registry is offline');
      return { ...publishedRegistry, agents: [] };
    },
  });
  await caller.agents.syncCatalog();
  await expect
    .poll(async () => (await caller.agents.catalog()).syncStatus)
    .toBe('idle');
  const accepted = await caller.agents.catalog();
  expect(accepted).toMatchObject({
    status: 'fresh',
    agents: [],
    fetchedAt: expect.any(Number),
  });
  offline = true;
  await caller.agents.syncCatalog();
  await expect
    .poll(async () => (await caller.agents.catalog()).syncStatus, {
      timeout: 4500,
    })
    .toBe('failed');
  expect(await caller.agents.catalog()).toMatchObject({
    status: 'stale',
    agents: [],
    fetchedAt: accepted.fetchedAt,
  });
});
