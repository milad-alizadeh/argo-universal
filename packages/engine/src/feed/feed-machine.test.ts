import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { terminalPaths } from '@repo/vitest/model-paths';
import { describe, expect, it } from 'vitest';
import {
  type AdjacencyMap,
  getShortestPaths,
  getSimplePaths,
  getAdjacencyMap,
} from 'xstate/graph';
import {
  machine,
  events,
  acpUpdateEventType,
  modelInput,
  streamBatchDelayEvent,
  storeDelayEvent,
  type FeedSnapshot,
  type FeedMachineEvent,
} from '#mocks/feed-model';
import { turnEndingEvent, permissionsCancelledEvent } from './turn-ending';

const vertex = (of: FeedSnapshot | undefined): string | undefined =>
  of && JSON.stringify({ value: of.value, open: Object.keys(of.context.rows) });

const previousValue = (
  snapshot: FeedSnapshot | undefined,
): string | undefined => JSON.stringify(snapshot?.value);

// The message's place, and the state value; `via` names how a vertex was reached.
const serializeWith =
  (
    via: (sameAsPrevious: boolean) => boolean,
  ): ((
    snapshot: FeedSnapshot,
    event: FeedMachineEvent | undefined,
    previous: FeedSnapshot | undefined,
  ) => string) =>
  (
    snapshot: FeedSnapshot,
    event: FeedMachineEvent | undefined,
    previous: FeedSnapshot | undefined,
  ): string => {
    const key = vertex(snapshot);

    return JSON.stringify({
      key,
      via:
        event && via(key === vertex(previous))
          ? `${previousValue(previous)} ${JSON.stringify(event)}`
          : undefined,
    });
  };

const canGraphEvent = (
  snapshot: FeedSnapshot,
  event: FeedMachineEvent,
): boolean => {
  switch (event.type) {
    case streamBatchDelayEvent:
      return snapshot.matches({ active: { stream: 'batching' } });
    case storeDelayEvent:
      return snapshot.matches({ active: { store: 'dirty' } });
    default:
      return snapshot.can(event);
  }
};

const modelOptions = {
  input: modelInput,
  events,
  // A done actor ignores events, so the model must not send any.
  filterEvents: (snapshot: FeedSnapshot, event: FeedMachineEvent): boolean =>
    snapshot.status === 'active' && canGraphEvent(snapshot, event),
};

// A vertex for each transition, so shortest paths reach back edges too.
const transitionOptions = {
  ...modelOptions,
  serializeState: serializeWith((): true => true),
};

const excludedOrderingEvents = new Set<string>([
  acpUpdateEventType,
  'feed.completeTurn',
  turnEndingEvent,
  permissionsCancelledEvent,
]);

// A vertex only for each self-transition keeps simple paths below 1,000.
const orderingOptions = {
  ...modelOptions,
  events: events.filter((event) => !excludedOrderingEvents.has(event.type)),
  serializeState: serializeWith((sameAsPrevious): boolean => sameAsPrevious),
};

const shortestPaths = terminalPaths(
  getShortestPaths(machine, transitionOptions),
);

const simplePaths = terminalPaths(getSimplePaths(machine, orderingOptions));

describe('Feed structural graph', (): void => {
  it('walks every transition with symbolic stream and storage timer events', (): void => {
    expect(
      unwalkedTransitions({
        models: [
          {
            getAdjacencyMap: (): AdjacencyMap<FeedSnapshot, FeedMachineEvent> =>
              getAdjacencyMap(machine, transitionOptions),
          },
        ],
        paths: [...shortestPaths, ...simplePaths],
        stateKey: (snapshot): string => JSON.stringify(snapshot.value),
        eventKey: (event): string => JSON.stringify(event),
      }),
    ).toEqual([]);
  });
  it('structurally flushes both parallel regions before reaching the final state', (): void => {
    const flushed = shortestPaths
      .flatMap((path) => path.steps)
      .filter((step) => step.state.status === 'done');

    expect(flushed.length).toBeGreaterThan(0);

    for (const { state } of flushed) {
      expect(state.matches('flushed')).toBe(true);
      expect(state.context.streamEvents).toEqual([]);
      expect(state.context.changedRowIds).toEqual([]);
    }
  });
});
