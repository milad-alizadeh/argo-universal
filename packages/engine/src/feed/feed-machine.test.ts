import type { FeedChange } from '@repo/contracts';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { terminalPaths } from '@repo/vitest/model-paths';
import { describe, expect, it } from 'vitest';
import { type SnapshotFrom } from 'xstate';
import {
  type AdjacencyMap,
  type GraphEventFromLogic,
  getShortestPaths,
  getSimplePaths,
  getAdjacencyMap,
} from 'xstate/graph';
import { feedMachine } from './feed-machine';

const acpUpdateEventType = 'feed.acpUpdate';
const modelAcpSessionId = 'model-session';
const firstMessageRowId = 'message-1#0';

/*
 * Symbolic graph traversal proves transition coverage only. Engine integration
 * tests exercise the actual stream timing, Writer, SQLite, and shutdown effects.
 */
const machine = feedMachine;
type FeedSnapshot = SnapshotFrom<typeof machine>;
const modelInput = {
  now: (): number => 1000,
  sessionId: 'session-1',
  epoch: 2,
  maxRevision: 0,
  nextPosition: 0,
  findWrittenRow: (): undefined => undefined,
};

const change = (
  feedChange: FeedChange,
): {
  readonly type: 'feed.change';
  readonly change: FeedChange;
  readonly turnId: 'turn-1';
} => ({ type: 'feed.change', change: feedChange, turnId: 'turn-1' }) as const;
const openMessage = change({
  type: 'upsert',
  update: {
    id: firstMessageRowId,
    state: 'open',
    sessionUpdate: 'agent_message',
    messageId: 'message-1',
    content: [{ type: 'text', text: '' }],
  },
});
const appendText = change({
  type: 'append',
  id: firstMessageRowId,
  field: 'content.0.text',
  text: 'a',
});
const settleMessage = change({
  type: 'patch',
  id: firstMessageRowId,
  set: { state: 'settled' },
});
const streamBatchDelayEvent =
  'xstate.after.streamBatchDelay.feed.active.stream.batching';
const storeDelayEvent = 'xstate.after.storeDelay.feed.active.store.dirty';

// Done events of states are left out: the model would send them before the regions are done.
const events = [
  openMessage,
  appendText,
  settleMessage,
  {
    type: acpUpdateEventType,
    acpSessionId: modelAcpSessionId,
    turnId: 'turn-1',
    update: {
      sessionUpdate: 'agent_message_chunk',
      messageId: 'model-message',
      content: { type: 'text', text: 'model text' },
    },
  },
  {
    type: acpUpdateEventType,
    acpSessionId: modelAcpSessionId,
    turnId: 'turn-1',
    update: {
      sessionUpdate: 'tool_call_update',
      toolCallId: 'model-tool',
      status: 'completed',
    },
  },
  {
    type: acpUpdateEventType,
    acpSessionId: modelAcpSessionId,
    turnId: 'turn-1',
    update: {
      sessionUpdate: 'notice',
      severity: 'info',
      title: 'Model notice',
    },
  },
  {
    type: acpUpdateEventType,
    acpSessionId: modelAcpSessionId,
    turnId: 'turn-1',
    update: {
      sessionUpdate: 'compaction_update',
      compactionId: 'model-compaction',
      status: 'completed',
    },
  },
  {
    type: acpUpdateEventType,
    acpSessionId: modelAcpSessionId,
    turnId: 'turn-1',
    update: { sessionUpdate: 'plan_removed', planId: 'unknown-plan' },
  },
  { type: 'feed.completeTurn', turnId: 'turn-1' },
  { type: 'feed.flush' },
  { type: streamBatchDelayEvent },
  { type: storeDelayEvent },
] satisfies GraphEventFromLogic<typeof machine>[];
type FeedMachineEvent = (typeof events)[number];

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
    const vertex = (of: FeedSnapshot | undefined): string | undefined =>
      of &&
      JSON.stringify({ value: of.value, open: Object.keys(of.context.rows) });
    const key = vertex(snapshot);
    return JSON.stringify({
      key,
      via:
        event && via(key === vertex(previous))
          ? `${JSON.stringify(previous?.value)} ${JSON.stringify(event)}`
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
// A vertex only for each self-transition keeps simple paths below 1,000.
const orderingOptions = {
  ...modelOptions,
  events: events.filter(
    (event) =>
      event.type !== acpUpdateEventType && event.type !== 'feed.completeTurn',
  ),
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
