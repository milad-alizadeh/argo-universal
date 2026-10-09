import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

it('keeps the last completed error visible while a retry is pending', async () => {
  const response = Promise.withResolvers<unknown>();
  const fetchAgents = vi
    .fn<() => Promise<unknown>>()
    .mockResolvedValueOnce(publishedRegistry)
    .mockRejectedValueOnce(new Error('Registry offline'))
    .mockImplementation(() => response.promise);
  const host = await startEngineTestHost({ fetchAgents });
  await host.caller.agents.syncCatalog();
  await host.caller.agents.syncCatalog();
  const accepted = await host.caller.agents.catalog();
  expect(accepted).toMatchObject({
    status: 'stale',
    error: 'Registry offline',
  });
  const retry = host.caller.agents.syncCatalog();
  try {
    await vi.waitFor(() => expect(fetchAgents).toHaveBeenCalledTimes(3));
    expect(await host.caller.agents.catalog()).toEqual(accepted);
  } finally {
    response.resolve(publishedRegistry);
    await retry;
  }
  expect(await host.caller.agents.catalog()).toMatchObject({
    status: 'fresh',
    error: null,
  });
});

it.each([150, 200])(
  'uses committed request identity when the next clock value is %i',
  async (nextTime) => {
    const agent = publishedRegistry.agents[0];
    if (!agent) throw new Error('Registry mock needs an Agent');
    let now = 100;
    const fetchAgents = vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce(publishedRegistry)
      .mockResolvedValueOnce({ ...publishedRegistry, agents: [] })
      .mockResolvedValue({
        ...publishedRegistry,
        agents: [{ ...agent, id: 'latest-agent' }],
      });
    const host = await startEngineTestHost({ fetchAgents, now: () => now });
    await host.caller.agents.syncCatalog();
    now = 200;
    await host.caller.agents.syncCatalog();
    const observer = new AbortController();
    const stream = await host
      .createCaller({ signal: observer.signal })
      .agents.catalogChanges();
    const notification = stream[Symbol.asyncIterator]().next();
    try {
      now = nextTime;
      const result = await host.caller.agents.syncCatalog();
      const catalog = await host.caller.agents.catalog();
      const currentIds = catalog.agents.map(({ id }) => id);
      expect(catalog).toMatchObject({ fetchedAt: nextTime, status: 'fresh' });
      expect(currentIds).toHaveLength(1);
      expect(result.changedIds).toEqual(currentIds);
      expect((await notification).value).toEqual(currentIds);
    } finally {
      observer.abort();
    }
  },
);
