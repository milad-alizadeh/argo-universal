import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { waitFor } from 'xstate';
import { startSettledRegistryHost } from '#mocks/registry-host';
import { fetchTimeoutMs } from './fetch-agents';

const offlineMessage = 'Registry offline';

type SwitchableRegistry = {
  offline: { value: boolean };
  fetchAgents: () => Promise<string>;
};

// Answers the published Registry until `offline` is set.
const switchableRegistry = (): SwitchableRegistry => {
  const offline = { value: false };

  return {
    offline,
    fetchAgents: async () => {
      if (offline.value) throw new Error(offlineMessage);

      return JSON.stringify(publishedRegistry);
    },
  };
};

// The start fetch answers; every later fetch is held until its signal aborts.
const startHeldRegistry = async (): Promise<
  Awaited<ReturnType<typeof startSettledRegistryHost>> & {
    held: AbortSignal[];
  }
> => {
  const held: AbortSignal[] = [];
  let started = false;

  const host = await startSettledRegistryHost({
    fetchAgents: (signal) => {
      if (!started) {
        started = true;

        return Promise.resolve(JSON.stringify(publishedRegistry));
      }

      held.push(signal);

      return new Promise<string>(() => {});
    },
  });

  return { ...host, held };
};

it('keeps cached Registry entries after a failed refresh', async () => {
  const registry = switchableRegistry();
  const host = await startSettledRegistryHost(registry);
  const cached = await host.caller.agents.registry();
  registry.offline.value = true;
  expect(await host.caller.agents.refreshRegistry()).toEqual(cached);
});

it('reports a failed refresh when no Registry entries are stored', async () => {
  const registry = switchableRegistry();
  const host = await startSettledRegistryHost(registry);
  host.database.$client.exec(
    `UPDATE registry_cache SET json = '{"version":"1.0.0","agents":[]}'`,
  );
  registry.offline.value = true;
  expect(await host.caller.agents.refreshRegistry()).toEqual({
    agents: [],
    error: `Error: ${offlineMessage}`,
  });
});

it('gives up a held fetch after 30 seconds', async () => {
  const host = await startHeldRegistry();
  vi.useFakeTimers();

  try {
    const refresh = host.caller.agents.refreshRegistry();
    await vi.waitFor(() => expect(host.held).toHaveLength(1));
    await vi.advanceTimersByTimeAsync(fetchTimeoutMs);
    await refresh;
  } finally {
    vi.useRealTimers();
  }

  expect(host.held[0]?.aborted).toBe(true);
  expect(host.actor.getSnapshot().context.error).toBe(
    'Registry did not answer within 30 seconds',
  );
});

it('aborts a held fetch on STOP', async () => {
  const host = await startHeldRegistry();
  host.actor.send({ type: 'REFRESH' });
  await waitFor(host.actor, (snapshot) => snapshot.matches('fetching'));
  host.actor.send({ type: 'STOP' });
  expect(host.held[0]?.aborted).toBe(true);
});

const malformedColumns = ["json = '{bad'", "fetched_at = 'invalid'"];

// A stored row damaged by `columns`, reopened by an Engine whose Registry starts offline.
const restartWithMalformedCache = async (
  columns: string,
): Promise<
  Awaited<ReturnType<typeof startSettledRegistryHost>> & {
    offline: { value: boolean };
  }
> => {
  const first = await startSettledRegistryHost();
  first.database.$client.exec(`UPDATE registry_cache SET ${columns}`);
  await first.stop();
  const registry = switchableRegistry();
  registry.offline.value = true;

  const host = await startSettledRegistryHost({
    ...registry,
    home: first.home,
  });

  return { ...host, offline: registry.offline };
};

it.each(malformedColumns)(
  'serves an empty Registry offline from a malformed cache (%s)',
  async (columns) => {
    const host = await restartWithMalformedCache(columns);
    expect(await host.caller.agents.registry()).toEqual({
      agents: [],
      error: `Error: ${offlineMessage}`,
    });
    expect(await host.caller.agents.servers()).toEqual([]);
  },
);

it.each(malformedColumns)(
  'replaces a malformed cache (%s) on the next successful refresh',
  async (columns) => {
    const host = await restartWithMalformedCache(columns);
    host.offline.value = false;
    expect((await host.caller.agents.refreshRegistry()).agents).toHaveLength(4);
  },
);
