import {
  type ModelWalk,
  type Vertex,
  walkGraph,
} from '@repo/vitest/model-test';
import { describe, expect, it } from 'vitest';
import {
  machine,
  fixtures,
  acpUpdateEventType,
  modelInput,
  type FeedSnapshot,
  type FeedMachineEvent,
} from '#mocks/feed-model';
import { messageRejectedEvent } from './rejected-message';
import {
  turnEndingEvent,
  permissionsCancelledEvent,
  permissionSelectedEvent,
} from './turn-ending';

// The message's place, and the state value.
const vertex = (snapshot: FeedSnapshot): Vertex => ({
  value: snapshot.value,
  open: Object.keys(snapshot.context.rows),
});

const sameVertex = (left: FeedSnapshot, right: FeedSnapshot): boolean =>
  JSON.stringify(vertex(left)) === JSON.stringify(vertex(right));

const excludedOrderingEvents = new Set<string>([
  acpUpdateEventType,
  'feed.completeTurn',
  turnEndingEvent,
  permissionsCancelledEvent,
  permissionSelectedEvent,
  messageRejectedEvent,
]);

// The machine sends the first two itself; the structural model has never sent the rest.
const omitted = [
  'feed.refreshChanges',
  'feed.changesRefreshed',
  'feed.nativePermissionOutcome',
  'feed.changeRejected',
  'feed.publish',
  'feed.changeApplied',
];

// Every arrival gets its own vertex, so shortest paths reach back edges too.
const transitions: ModelWalk<typeof machine, FeedMachineEvent> = {
  name: 'shortest path',
  search: 'shortest',
};

// An arrival gets its own vertex only for a self-transition, which keeps simple paths below 1,000.
const ordering: ModelWalk<typeof machine, FeedMachineEvent> = {
  name: 'simple path',
  search: 'simple',
  permits: (_, event): boolean => !excludedOrderingEvents.has(event.type),
  arrival: (snapshot, event, previous): string =>
    sameVertex(snapshot, previous)
      ? `${JSON.stringify(previous.value)} ${JSON.stringify(event)}`
      : '',
};

const { paths, unwalked } = walkGraph(machine, {
  input: modelInput,
  fixtures,
  omitted,
  vertex,
  eventKey: (event): string => JSON.stringify(event),
  walks: [transitions, ordering],
});

describe('Feed structural graph', (): void => {
  it('walks every transition with symbolic stream and storage timer events', (): void => {
    expect(unwalked()).toEqual([]);
  });
  it('structurally flushes both parallel regions before reaching the final state', (): void => {
    const flushed = paths
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
