import type { AgentAdapter, AgentProbe } from '@repo/agents';
import { createMockAdapter } from '@repo/mocks/agent';
import { afterEach, expect, it, vi } from 'vitest';
import { availableAgentProbe } from '#mocks/agent-catalog';
import { startRouterTestHost } from '#mocks/router';

afterEach((): void => {
  vi.useRealTimers();
});

it('shares one pending native discovery between concurrent refresh queries', async (): Promise<void> => {
  const signInAgain = 'Sign in again';
  const refreshed = Promise.withResolvers<AgentProbe>();
  const refreshStarted = Promise.withResolvers<void>();
  const discoverAgent = vi
    .fn<AgentAdapter['probe']>()
    .mockResolvedValueOnce(availableAgentProbe)
    .mockImplementation((): Promise<AgentProbe> => {
      refreshStarted.resolve();
      return refreshed.promise;
    });
  const { caller } = startRouterTestHost({
    adapters: [createMockAdapter({ probe: discoverAgent })],
  });
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

it('reports failed native discovery through the public unavailable result', async (): Promise<void> => {
  const { caller } = startRouterTestHost({
    adapters: [
      createMockAdapter(
        {
          probe: (): Promise<AgentProbe> =>
            Promise.reject(new Error('Spawn failed')),
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

it('aborts timed-out native discovery before returning an unavailable result', async (): Promise<void> => {
  vi.useFakeTimers();
  const discoverySignal = Promise.withResolvers<AbortSignal>();
  const { caller } = startRouterTestHost({
    adapters: [
      createMockAdapter(
        {
          probe: (signal): Promise<AgentProbe> => {
            discoverySignal.resolve(signal);
            return new Promise((): void => {});
          },
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
  expect((await discoverySignal.promise).aborted).toBe(true);
});

it('cancels pending native discovery when the owning registry shuts down', async (): Promise<void> => {
  const abortedDiscovery = Promise.withResolvers<void>();
  const { sessionRegistry } = startRouterTestHost({
    adapters: [
      createMockAdapter({
        probe: (signal): Promise<AgentProbe> => {
          signal.addEventListener(
            'abort',
            (): void => abortedDiscovery.resolve(),
            { once: true },
          );
          return new Promise((): void => {});
        },
      }),
    ],
  });
  sessionRegistry.send({ type: 'sessions.stopAll' });
  await expect(abortedDiscovery.promise).resolves.toBeUndefined();
});
