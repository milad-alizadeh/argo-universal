import type { AgentProbe } from '@repo/agents';
import { createAgentMetadata } from '@repo/mocks/agent';
import { afterEach, expect, it, vi } from 'vitest';
import { availableAgentProbe } from '#mocks/agent-catalog';
import { startEngineTestHost } from '#mocks/engine';

afterEach((): void => {
  vi.useRealTimers();
});

it('shares one pending Agent discovery between concurrent refresh queries', async (): Promise<void> => {
  const signInAgain = 'Sign in again';
  const refreshed = Promise.withResolvers<AgentProbe>();
  const refreshStarted = Promise.withResolvers<void>();
  const adapter = createAgentMetadata({
    discovery: [
      { result: availableAgentProbe },
      { result: refreshed.promise, started: refreshStarted },
    ],
  });
  const discoverAgent = vi.spyOn(adapter, 'probe');
  const { caller } = await startEngineTestHost({ adapters: [adapter] });
  await caller.agents.list();
  const catalogs = Promise.all([
    caller.agents.list({ refresh: true }),
    caller.agents.list({ refresh: true }),
  ]);
  await refreshStarted.promise;
  refreshed.resolve({
    availability: 'not_signed_in',
    installStep: signInAgain,
    configOptions: [],
  });
  expect(await catalogs).toMatchObject([
    [{ availability: 'not_signed_in', installStep: signInAgain }],
    [{ availability: 'not_signed_in', installStep: signInAgain }],
  ]);
  expect(discoverAgent).toHaveBeenCalledTimes(2);
});

it('reports failed Agent discovery through the public unavailable result', async (): Promise<void> => {
  const { caller } = await startEngineTestHost({
    adapters: [
      createAgentMetadata(
        {
          discovery: [{ error: 'Spawn failed' }],
        },
        'broken',
      ),
    ],
  });
  expect(await caller.agents.list()).toEqual([
    {
      agent: 'broken',
      label: 'broken',
      logo: expect.stringContaining('<svg'),
      availability: 'unavailable',
      installStep: 'broken did not start: Spawn failed',
      configOptions: [],
    },
  ]);
});

it('aborts timed-out Agent discovery before returning an unavailable result', async (): Promise<void> => {
  vi.useFakeTimers();
  const signals: AbortSignal[] = [];
  const { caller } = await startEngineTestHost({
    adapters: [
      createAgentMetadata(
        {
          discovery: [{ signals, waitFor: new Promise(() => {}) }],
        },
        'slow',
      ),
    ],
  });
  const catalog = caller.agents.list();
  await vi.advanceTimersByTimeAsync(20_000);
  expect(await catalog).toEqual([
    {
      agent: 'slow',
      label: 'slow',
      logo: expect.stringContaining('<svg'),
      availability: 'unavailable',
      installStep: 'slow did not start: no answer within 20 seconds',
      configOptions: [],
    },
  ]);
  expect(signals[0]?.aborted).toBe(true);
});

it('cancels pending Agent discovery when the open Sessions machine stops', async (): Promise<void> => {
  const signals: AbortSignal[] = [];
  const { stop } = await startEngineTestHost({
    adapters: [
      createAgentMetadata({
        discovery: [{ signals, waitFor: new Promise(() => {}) }],
      }),
    ],
  });
  await stop();
  expect(signals[0]?.aborted).toBe(true);
});
