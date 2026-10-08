import type { AgentProbe } from '@repo/agents';
import { createMockAdapter } from '@repo/mocks/agent';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { terminalPaths } from '@repo/vitest/model-paths';
import { afterEach, expect, it, vi } from 'vitest';
import { createActor, fromPromise, type SnapshotFrom } from 'xstate';
import {
  type AdjacencyMap,
  type GraphEventFromLogic,
  getShortestPaths,
  getAdjacencyMap,
} from 'xstate/graph';
import { agentProbeMachine } from './agent-probe-machine';

const refreshProbeEvent = 'agentProbe.refresh';

afterEach((): import('vitest').VitestUtils => vi.useRealTimers());

const available: AgentProbe = { availability: 'available', configOptions: [] };
const input = { adapter: createMockAdapter() };
let probeCall = Promise.withResolvers<AgentProbe>();
const machine = agentProbeMachine.provide({
  actors: {
    probe: fromPromise((): Promise<AgentProbe> => {
      probeCall = Promise.withResolvers<AgentProbe>();
      return probeCall.promise;
    }),
  },
});
type ProbeSnapshot = SnapshotFrom<typeof machine>;
const events = [
  { type: refreshProbeEvent },
  { type: 'xstate.done.actor.probe', actorId: 'probe', output: available },
  {
    type: 'xstate.error.actor.probe',
    actorId: 'probe',
    error: new Error('Crashed'),
  },
  { type: 'xstate.after.probeTimeout.agentProbe.probing' },
] satisfies GraphEventFromLogic<typeof machine>[];
type ProbeEvent = (typeof events)[number];
const key = (snapshot: ProbeSnapshot): string =>
  JSON.stringify({
    value: snapshot.value,
    availability: snapshot.context.probe?.availability ?? null,
  });
const options = {
  input,
  events,
  filterEvents: (snapshot: ProbeSnapshot, event: ProbeEvent): boolean =>
    snapshot.status === 'active' &&
    (event.type === refreshProbeEvent
      ? snapshot.can(event)
      : snapshot.matches('probing')),
  serializeState: (
    snapshot: ProbeSnapshot,
    event: ProbeEvent | undefined,
    previous?: ProbeSnapshot,
  ): string =>
    JSON.stringify({
      key: key(snapshot),
      via: event && `${previous && key(previous)} ${event.type}`,
    }),
};
const paths = terminalPaths(getShortestPaths(machine, options));

it.each(
  paths.map(
    (path, index): readonly [number, typeof path] => [index, path] as const,
  ),
)('walks agent probe model path %i', async (_, path): Promise<void> => {
  vi.useFakeTimers();
  const actor = createActor(machine, { input }).start();
  try {
    for (const step of path.steps) {
      switch (step.event.type) {
        case refreshProbeEvent:
          actor.send(step.event);
          break;
        case 'xstate.done.actor.probe':
          probeCall.resolve(step.event.output);
          await vi.advanceTimersByTimeAsync(0);
          break;
        case 'xstate.error.actor.probe':
          probeCall.reject(step.event.error);
          await vi.advanceTimersByTimeAsync(0);
          break;
        case 'xstate.after.probeTimeout.agentProbe.probing':
          await vi.advanceTimersByTimeAsync(20_000);
          break;
      }
      expect(key(actor.getSnapshot())).toBe(key(step.state));
    }
  } finally {
    actor.stop();
  }
});

it('the generated agent probe paths walk every transition', (): void => {
  expect(
    unwalkedTransitions({
      models: [
        {
          getAdjacencyMap: (): AdjacencyMap<ProbeSnapshot, ProbeEvent> =>
            getAdjacencyMap(machine, options),
        },
      ],
      paths,
      stateKey: key,
      eventKey: (event): typeof event.type => event.type,
    }),
  ).toEqual([]);
});
