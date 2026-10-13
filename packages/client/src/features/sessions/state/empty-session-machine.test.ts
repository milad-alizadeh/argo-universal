import type { SessionConfigOption } from '@repo/contracts';
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
  first,
  graphOptions,
  isPublicEvent,
  key,
  nextChange,
  options,
  paths,
  prompt,
  promptShowTimedOut,
} from '../../../../mocks/empty-session-model';
import {
  choiceDebounceMs,
  type EmptySessionPorts,
  promptShowTimeoutMs,
  emptySessionMachine,
} from './empty-session-machine';

// Each port call waits for the path to settle it.
interface Calls {
  open?: PromiseWithResolvers<{ sessionId: string }>;
  close?: PromiseWithResolvers<unknown>;
  setConfigOption?: PromiseWithResolvers<SessionConfigOption[]>;
  prompt?: PromiseWithResolvers<unknown>;
}
let calls: Calls;
let handedOff: string[];
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
  handOff: (sessionId) => handedOff.push(sessionId),
  nextChange,
});

beforeEach(() => {
  vi.useFakeTimers();
  calls = {};
  handedOff = [];
});
afterEach(() => {
  vi.useRealTimers();
});

const takeCall = (id: ActorId): NonNullable<Calls[ActorId]> => {
  const call = calls[id];
  if (!call) throw new Error(`${id} was not called`);
  calls[id] = undefined;
  return call;
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
    [
      done(id),
      (event): void => takeCall(id).resolve(Reflect.get(event, 'output')),
    ],
    [
      failed(id),
      (event): void => takeCall(id).reject(Reflect.get(event, 'error')),
    ],
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

it('hands the prompted Session to the Session page once its Feed shows the prompt', async () => {
  const actor = createActor(emptySessionMachine, { input: ports() }).start();
  const sent: EmptySessionGraphEvent[] = [
    { type: 'choices.changed', input: first, connected: true },
    { type: 'send', prompt },
    { type: delayDone },
    { type: done('open'), actorId: 'open', output: { sessionId: 'session-1' } },
    { type: 'options.loaded', configOptions: options, saved: {} },
    { type: done('prompt'), actorId: 'prompt', output: undefined },
  ];
  for (const event of sent) await deliver(actor, event);
  const beforeFeed = [...handedOff];
  await deliver(actor, { type: 'feed.showsPrompt' });
  expect([beforeFeed, handedOff]).toEqual([[], ['session-1']]);
});
