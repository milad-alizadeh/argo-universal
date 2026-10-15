import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { waitFor } from 'xstate';
import { startEngineTestHost } from '#mocks/engine';
import { requestRegistry, type RegistryActor } from './registry-machine';

it('throttles launch checks per Engine run and always refreshes on page opening', async () => {
  let now = 0;

  const fetchAgents = vi.fn<() => Promise<string>>(async () =>
    JSON.stringify(publishedRegistry),
  );

  const host = await startEngineTestHost({ now: () => now, fetchAgents });
  const actor: RegistryActor = host.engine.system.get('registry');
  expect(fetchAgents).not.toHaveBeenCalled();
  await requestRegistry(actor, 'STALE');
  await requestRegistry(actor, 'STALE');
  expect(fetchAgents).toHaveBeenCalledTimes(1);
  now = 3_600_000;
  await requestRegistry(actor, 'STALE');
  expect(fetchAgents).toHaveBeenCalledTimes(2);
  await host.caller.agents.refreshRegistry();
  expect(fetchAgents).toHaveBeenCalledTimes(3);
  expect(await host.caller.agents.registry()).toMatchObject({
    error: null,
    agents: expect.arrayContaining([
      expect.objectContaining({ entry: publishedRegistry.agents[0] }),
    ]),
  });
});

it('retains cached Registry entries after a failed refresh and exposes errors only without stored JSON', async () => {
  let fail = false;

  const host = await startEngineTestHost({
    fetchAgents: async () => {
      if (fail) throw new Error('Registry offline');

      return JSON.stringify(publishedRegistry);
    },
  });

  const cached = await host.caller.agents.refreshRegistry();
  fail = true;
  expect(await host.caller.agents.refreshRegistry()).toEqual(cached);
  host.database.$client.exec(
    `UPDATE registry_cache SET json = '{"version":"1.0.0","agents":[]}'`,
  );
  expect(await host.caller.agents.refreshRegistry()).toEqual({
    agents: [],
    error: 'Error: Registry offline',
  });
});

it('bounds a held fetch at 30 seconds and aborts it on STOP', async () => {
  const signals: AbortSignal[] = [];

  const host = await startEngineTestHost({
    fetchAgents: (signal) => {
      signals.push(signal);

      return new Promise<string>(() => {});
    },
  });

  const actor: RegistryActor = host.engine.system.get('registry');
  vi.useFakeTimers();

  try {
    const refresh = host.caller.agents.refreshRegistry();
    await vi.waitFor(() => expect(signals).toHaveLength(1));
    await vi.advanceTimersByTimeAsync(30_000);
    await refresh;
    expect(signals[0]?.aborted).toBe(true);
    expect(actor.getSnapshot().context.error).toMatch('30 seconds');
    actor.send({ type: 'REFRESH' });
    await waitFor(actor, (snapshot) => snapshot.matches('fetching'));
    actor.send({ type: 'STOP' });
    expect(signals[1]?.aborted).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});

it('fetches on Engine start without a stored row and forgets the previous run attempt time', async () => {
  const fetchAgents = vi.fn<() => Promise<string>>(async () =>
    JSON.stringify(publishedRegistry),
  );

  const first = await startEngineTestHost({ fetchAgents });
  await first.caller.agents.refreshRegistry();
  first.database.$client.exec('DELETE FROM registry_cache');
  await first.stop();
  const second = await startEngineTestHost({ home: first.home, fetchAgents });
  await expect.poll(() => fetchAgents.mock.calls.length).toBe(2);
  await expect
    .poll(async () => (await second.caller.agents.registry()).agents.length)
    .toBe(4);
});

it.each(["json = '{bad'", "fetched_at = 'invalid'"])(
  'starts with malformed cache (%s), remains usable offline, and repairs it on refresh',
  async (columns) => {
    let offline = true;
    const first = await startEngineTestHost();
    first.database.$client.exec(`UPDATE registry_cache SET ${columns}`);
    await first.stop();

    const second = await startEngineTestHost({
      home: first.home,
      fetchAgents: async () => {
        if (offline) throw new Error('Registry offline');

        return JSON.stringify(publishedRegistry);
      },
    });

    await requestRegistry(second.engine.system.get('registry'), 'STALE');
    expect(await second.caller.agents.registry()).toEqual({
      agents: [],
      error: 'Error: Registry offline',
    });
    expect(await second.caller.agents.servers()).toEqual([]);
    offline = false;
    expect((await second.caller.agents.refreshRegistry()).agents).toHaveLength(
      4,
    );
  },
);
