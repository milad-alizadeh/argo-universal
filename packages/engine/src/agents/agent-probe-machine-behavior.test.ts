import type { AgentProbe } from '@repo/agents';
import { createAgentMetadata } from '@repo/mocks/agent';
import { afterEach, expect, it, vi, type VitestUtils } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { agentProbeMachine } from './agent-probe-machine';

const refreshProbeEvent = 'agentProbe.refresh';
const available: AgentProbe = { availability: 'available', configOptions: [] };
afterEach((): VitestUtils => vi.useRealTimers());

it('shares a running probe with a refresh, and probes again once settled', async (): Promise<void> => {
  const settle = Promise.withResolvers<AgentProbe>();
  const adapter = createAgentMetadata({
    discovery: [{ result: settle.promise }],
  });
  const probe = vi.spyOn(adapter, 'probe');
  const actor = createActor(agentProbeMachine, {
    input: { adapter },
  }).start();
  actor.send({ type: refreshProbeEvent });
  expect(probe).toHaveBeenCalledTimes(1);
  settle.resolve(available);
  await waitFor(actor, (snapshot): boolean => snapshot.matches('probed'));
  expect(actor.getSnapshot().context.probe).toEqual(available);
  actor.send({ type: refreshProbeEvent });
  expect(actor.getSnapshot().matches('probing')).toBe(true);
  expect(probe).toHaveBeenCalledTimes(2);
  actor.stop();
});

it('reports an Agent whose probe fails as unavailable, with the reason', async (): Promise<void> => {
  const actor = createActor(agentProbeMachine, {
    input: {
      adapter: createAgentMetadata({
        discovery: [{ error: 'Spawn failed' }],
      }),
    },
  }).start();
  await waitFor(actor, (snapshot): boolean => snapshot.matches('probed'));
  expect(actor.getSnapshot().context.probe).toEqual({
    availability: 'unavailable',
    installStep: 'mock did not start: Spawn failed',
    configOptions: [],
  });
  actor.stop();
});

it('aborts a probe with no answer after the timeout and reports the Agent as unavailable', async (): Promise<void> => {
  vi.useFakeTimers();
  const signals: AbortSignal[] = [];
  const actor = createActor(agentProbeMachine, {
    input: {
      adapter: createAgentMetadata({
        discovery: [{ signals, waitFor: new Promise(() => {}) }],
      }),
    },
  }).start();
  await vi.advanceTimersByTimeAsync(20_000);
  expect(signals[0]?.aborted).toBe(true);
  expect(actor.getSnapshot()).toMatchObject({
    value: 'probed',
    context: {
      probe: {
        availability: 'unavailable',
        installStep: 'mock did not start: no answer within 20 seconds',
      },
    },
  });
  actor.stop();
});
