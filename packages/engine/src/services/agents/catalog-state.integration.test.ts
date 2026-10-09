import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

const offlineMessage = 'Registry offline';

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
