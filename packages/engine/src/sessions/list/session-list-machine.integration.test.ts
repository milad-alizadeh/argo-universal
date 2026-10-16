import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { terminalPaths } from '@repo/vitest/model-paths';
import { afterAll, expect, it } from 'vitest';
import { fromCallback } from 'xstate';
import { createActor, SimulatedClock, type SnapshotFrom } from 'xstate';
import {
  type AdjacencyMap,
  type GraphEventFromLogic,
  getAdjacencyMap,
  getShortestPaths,
} from 'xstate/graph';
import { openSessionListModel } from '#mocks/session-list-model';
import { sessionListMachine } from './session-list-machine';

const refreshListEvent = 'list.refresh';

const refreshDelayEvent =
  'xstate.after.listRefreshDelay.sessionList.active.pending';

const { input, remove } = openSessionListModel();

afterAll(remove);

const machine = sessionListMachine.provide({
  actors: { observe: fromCallback((): void => {}) },
});

type ListSnapshot = SnapshotFrom<typeof machine>;

// The model drives the pending state's named delay event as well as public events.
const events = [
  { type: refreshListEvent },
  { type: 'list.failed', error: 'Unavailable database' },
  { type: 'list.stop' },
  { type: 'list.flush' },
  { type: refreshDelayEvent },
] satisfies GraphEventFromLogic<typeof machine>[];

type ListEvent = (typeof events)[number];

const key = (snapshot: ListSnapshot): string => JSON.stringify(snapshot.value);

const options = {
  input,
  events,
  filterEvents: (snapshot: ListSnapshot, event: ListEvent): boolean =>
    snapshot.status === 'active' && permittedEvent(snapshot, event),
  serializeState: (
    snapshot: ListSnapshot,
    event: ListEvent | undefined,
    previous?: ListSnapshot,
  ): string =>
    JSON.stringify({
      value: snapshot.value,
      via: event && `${previous && key(previous)} ${event.type}`,
    }),
};

const paths = terminalPaths(getShortestPaths(machine, options));

it.each(
  paths.map(
    (path, index): readonly [number, typeof path] => [index, path] as const,
  ),
)('walks list subscription model path %i', async (_, path): Promise<void> => {
  const clock = new SimulatedClock();
  const actor = createActor(machine, { input, clock }).start();

  const execute = (event: ListEvent): void => {
    if (event.type === refreshDelayEvent) clock.increment(100);
    else actor.send(event);
  };

  try {
    for (const [index, step] of path.steps.entries()) {
      if (index > 0) execute(step.event);
      expect(key(actor.getSnapshot())).toBe(key(step.state));
      expect(actor.getSnapshot().status).toBe(step.state.status);
    }
  } finally {
    actor.stop();
  }
});

it('the generated list subscription paths walk every transition', (): void => {
  expect(
    unwalkedTransitions({
      models: [
        {
          getAdjacencyMap: (): AdjacencyMap<ListSnapshot, ListEvent> =>
            getAdjacencyMap(machine, options),
        },
      ],
      paths,
      stateKey: key,
      eventKey: (event): typeof event.type => event.type,
    }),
  ).toEqual([]);
});

function permittedEvent(snapshot: ListSnapshot, event: ListEvent): boolean {
  if (event.type === refreshListEvent) return true;

  return event.type === refreshDelayEvent
    ? snapshot.matches({ active: 'pending' })
    : snapshot.can(event);
}
