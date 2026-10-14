import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { type Actor, createActor } from 'xstate';
import { type AdjacencyMap, getAdjacencyMap } from 'xstate/graph';
import {
  type ActorId,
  actorIds,
  delayDone,
  done,
  type EmptySessionGraphEvent,
  type EmptySessionSnapshot,
  failed,
  failure,
  graphOptions,
  isPublicEvent,
  key,
  options,
  paths,
  promptShowTimedOut,
} from '../../../../mocks/empty-session-model';
import {
  choiceDebounceMs,
  type EmptySessionPorts,
  promptShowTimeoutMs,
  emptySessionMachine,
} from './empty-session-machine';

// What each port call resolves with when its path's done event arrives.
const portOutputs = {
  open: { sessionId: 'session-1' },
  close: {},
  setConfigOption: options,
  prompt: { messageId: 'message-1' },
} satisfies { [Id in ActorId]: Awaited<ReturnType<EmptySessionPorts[Id]>> };

type PortOutputs = typeof portOutputs;

// Each port call waits for the path to settle it.
type Calls = { [Id in ActorId]?: PromiseWithResolvers<PortOutputs[Id]> };

let calls: Calls;

const track = <Id extends ActorId>(
  id: Id,
  call: NonNullable<Calls[Id]>,
): NonNullable<Calls[Id]>['promise'] => {
  calls[id] = call;

  return call.promise;
};

const ports = (): EmptySessionPorts => ({
  open: () => track('open', Promise.withResolvers()),
  close: () => track('close', Promise.withResolvers()),
  setConfigOption: () => track('setConfigOption', Promise.withResolvers()),
  prompt: () => track('prompt', Promise.withResolvers()),
  handOff: () => {},
  clearDraft: () => {},
});

beforeEach(() => {
  vi.useFakeTimers();
  calls = {};
});

afterEach(() => {
  vi.useRealTimers();
});

const takeCall = <Id extends ActorId>(id: Id): NonNullable<Calls[Id]> => {
  const call = calls[id];

  if (!call) throw new Error(`${id} was not called`);
  calls[id] = undefined;

  return call;
};

// A path's done event resolves the port call with the output that event carries.
const resolveCall = <Id extends ActorId>(id: Id): void => {
  takeCall(id).resolve(portOutputs[id]);
};

type Delivery = (event: EmptySessionGraphEvent) => void;

const deliveries = new Map<string, Delivery>([
  [
    delayDone,
    (): void => {
      vi.advanceTimersByTime(choiceDebounceMs);
    },
  ],
  [
    promptShowTimedOut,
    (): void => {
      vi.advanceTimersByTime(promptShowTimeoutMs);
    },
  ],
  ...actorIds.flatMap((id): [string, Delivery][] => [
    [done(id), (): void => resolveCall(id)],
    [failed(id), (): void => takeCall(id).reject(failure)],
  ]),
]);

// The promise ports settle and the machine takes their results.
const settle = async (): Promise<void> => {
  for (let tick = 0; tick < 5; tick += 1) await Promise.resolve();
};

const deliver = async (
  actor: Actor<typeof emptySessionMachine>,
  event: EmptySessionGraphEvent,
): Promise<void> => {
  if (isPublicEvent(event)) actor.send(event);
  else deliveries.get(event.type)?.(event);
  await settle();
};

it.each(paths.map((path, index) => [index, path] as const))(
  'walks empty Session path %i',
  async (_, path) => {
    const actor = createActor(emptySessionMachine, { input: ports() }).start();

    try {
      for (const step of path.steps.slice(1)) {
        await deliver(actor, step.event);
        expect(key(actor.getSnapshot())).toBe(key(step.state));
      }
    } finally {
      actor.stop();
    }
  },
);

it('empty Session paths cover every transition', () => {
  expect(
    unwalkedTransitions({
      models: [
        {
          getAdjacencyMap: (): AdjacencyMap<
            EmptySessionSnapshot,
            EmptySessionGraphEvent
          > => getAdjacencyMap(emptySessionMachine, graphOptions),
        },
      ],
      paths,
      stateKey: key,
      eventKey: (event) => event.type,
    }),
  ).toEqual([]);
});
