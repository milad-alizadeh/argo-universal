import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { startSettledRegistryHost } from '#mocks/registry-host';
import { hourMs, requestRegistry } from './registry-machine';

const publishedFetch = (): ReturnType<typeof vi.fn<() => Promise<string>>> =>
  vi.fn<() => Promise<string>>(async () => JSON.stringify(publishedRegistry));

type FetchMock = ReturnType<typeof publishedFetch>;

// A previous run that stored a row and then lost it; its fetch is not counted.
const deletedRowHome = async (
  fetchAgents: FetchMock,
): Promise<{ home: string }> => {
  const first = await startSettledRegistryHost({ fetchAgents });
  first.database.$client.exec('DELETE FROM registry_cache');
  await first.stop();
  fetchAgents.mockClear();

  return { home: first.home };
};

const freshHome = async (): Promise<{ home?: string }> => ({});

it.each([
  { stored: 'a fresh database', arrange: freshHome },
  { stored: 'a deleted row from a previous run', arrange: deletedRowHome },
])('fetches the Registry once at Engine start from $stored', async (row) => {
  const fetchAgents = publishedFetch();
  const home = await row.arrange(fetchAgents);
  const host = await startSettledRegistryHost({ ...home, fetchAgents });
  expect(fetchAgents).toHaveBeenCalledTimes(1);
  expect((await host.caller.agents.registry()).agents).toHaveLength(4);
});

it('skips the start fetch when a Registry row is stored', async () => {
  const fetchAgents = publishedFetch();
  const first = await startSettledRegistryHost({ fetchAgents });
  await first.stop();
  await startSettledRegistryHost({ home: first.home, fetchAgents });
  expect(fetchAgents).toHaveBeenCalledTimes(1);
});

it('checks a stored Registry on the first launch check of a new Engine run', async () => {
  const fetchAgents = publishedFetch();
  const first = await startSettledRegistryHost({ now: () => 0, fetchAgents });
  await first.stop();

  const second = await startSettledRegistryHost({
    home: first.home,
    now: () => 0,
    fetchAgents,
  });

  await requestRegistry(second.actor, 'STALE');
  expect(fetchAgents).toHaveBeenCalledTimes(2);
});

it('skips launch checks within an hour of the last attempt', async () => {
  const fetchAgents = publishedFetch();

  const { actor } = await startSettledRegistryHost({
    now: () => 0,
    fetchAgents,
  });

  await requestRegistry(actor, 'STALE');
  await requestRegistry(actor, 'STALE');
  expect(fetchAgents).toHaveBeenCalledTimes(1);
});

it('refetches on a launch check an hour after the last attempt', async () => {
  let now = 0;
  const fetchAgents = publishedFetch();

  const { actor } = await startSettledRegistryHost({
    now: () => now,
    fetchAgents,
  });

  now = hourMs - 1;
  await requestRegistry(actor, 'STALE');
  expect(fetchAgents).toHaveBeenCalledTimes(1);
  now = hourMs;
  await requestRegistry(actor, 'STALE');
  expect(fetchAgents).toHaveBeenCalledTimes(2);
});

it('fetches every time the Agents page refreshes', async () => {
  const fetchAgents = publishedFetch();
  const host = await startSettledRegistryHost({ now: () => 0, fetchAgents });
  const registry = await host.caller.agents.refreshRegistry();
  expect(fetchAgents).toHaveBeenCalledTimes(2);
  expect(registry).toMatchObject({
    error: null,
    agents: expect.arrayContaining([
      expect.objectContaining({ entry: publishedRegistry.agents[0] }),
    ]),
  });
});
