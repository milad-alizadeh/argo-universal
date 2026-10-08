import type { AgentProbe } from '@repo/agents';
import { createMockAdapter } from '@repo/mocks/agent';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterEach, expect, it, vi } from 'vitest';
import {
  type AnyEventObject,
  createActor,
  type EventFromLogic,
  fromPromise,
  type SnapshotFrom,
  waitFor,
} from 'xstate';
import { type EventExecutor, TestModel } from 'xstate/graph';
import { agentProbeMachine } from './agent-probe-machine';

afterEach((): import('vitest').VitestUtils => vi.useRealTimers());

const available: AgentProbe = { availability: 'available', configOptions: [] };
const input = { adapter: createMockAdapter() };
// The model drives the probe's outcome itself, so the probe never settles.
const machine = agentProbeMachine.provide({
  actors: {
    probe: fromPromise(
      (): Promise<AgentProbe> => new Promise<AgentProbe>((): void => {}),
    ),
  },
});
type ProbeEvent = EventFromLogic<typeof machine>;
type ProbeSnapshot = SnapshotFrom<typeof machine>;
type ProbeExecutor = EventExecutor<ProbeSnapshot, ProbeEvent>;
const events = [
  { type: 'agentProbe.refresh' },
  { type: 'xstate.done.actor.probe', output: available },
  { type: 'xstate.error.actor.probe', error: new Error('Crashed') },
  { type: 'xstate.after.probeTimeout.agentProbe.probing' },
] as unknown as ProbeEvent[];
const key = (snapshot: ProbeSnapshot): string =>
  JSON.stringify({
    value: snapshot.value,
    availability: snapshot.context.probe?.availability ?? null,
  });
const model = new TestModel(machine, {
  input,
  events,
  filterEvents: (snapshot, event): boolean =>
    snapshot.status === 'active' &&
    (event.type.startsWith('xstate.')
      ? snapshot.matches('probing')
      : snapshot.can(event)),
  serializeState: (snapshot, event, previous): string =>
    JSON.stringify({
      key: key(snapshot),
      via: event && `${previous && key(previous)} ${event.type}`,
    }),
});
const paths = model.getShortestPaths();

it.each(
  paths.map(
    (path, index): readonly [number, typeof path] => [index, path] as const,
  ),
)('walks agent probe model path %i', async (_, path): Promise<void> => {
  const actor = createActor(machine, { input }).start();
  try {
    await path.test({
      events: Object.fromEntries(
        events.map(({ type }): [ProbeEvent['type'], ProbeExecutor] => [
          type,
          ({ event }: { event: AnyEventObject }): void =>
            actor.send(event as ProbeEvent),
        ]),
      ),
      states: {
        '*': (expected): void => {
          expect(key(actor.getSnapshot())).toBe(key(expected));
        },
      },
    });
  } finally {
    actor.stop();
  }
});

it('the generated agent probe paths walk every transition', (): void => {
  expect(
    unwalkedTransitions({
      models: [model],
      paths,
      stateKey: key,
      eventKey: (event): typeof event.type => event.type,
    }),
  ).toEqual([]);
});

it('shares a running probe with a refresh, and probes again once settled', async (): Promise<void> => {
  const settle = Promise.withResolvers<AgentProbe>();
  const probe = vi.fn((): Promise<AgentProbe> => settle.promise);
  const actor = createActor(agentProbeMachine, {
    input: { adapter: createMockAdapter({ probe }) },
  }).start();
  actor.send({ type: 'agentProbe.refresh' });
  expect(probe).toHaveBeenCalledTimes(1);
  settle.resolve(available);
  await waitFor(actor, (snapshot): boolean => snapshot.matches('probed'));
  expect(actor.getSnapshot().context.probe).toEqual(available);
  actor.send({ type: 'agentProbe.refresh' });
  expect(actor.getSnapshot().matches('probing')).toBe(true);
  expect(probe).toHaveBeenCalledTimes(2);
  actor.stop();
});

it('reports an Agent whose probe fails as unavailable, with the reason', async (): Promise<void> => {
  const actor = createActor(agentProbeMachine, {
    input: {
      adapter: createMockAdapter({
        probe: (): Promise<AgentProbe> =>
          Promise.reject(new Error('Spawn failed')),
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
  let signal: AbortSignal | undefined;
  const actor = createActor(agentProbeMachine, {
    input: {
      adapter: createMockAdapter({
        probe: (probeSignal): Promise<AgentProbe> => {
          signal = probeSignal;
          return new Promise((): void => {});
        },
      }),
    },
  }).start();
  await vi.advanceTimersByTimeAsync(20_000);
  expect(signal?.aborted).toBe(true);
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
