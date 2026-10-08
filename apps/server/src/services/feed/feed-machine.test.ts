import type { FeedChange } from '@repo/contracts';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Actor,
  type ActorLogic,
  type AnyEventObject,
  createActor,
  matchesState,
  type EventFromLogic,
  type SnapshotFrom,
} from 'xstate';
import { type EventExecutor, TestModel, type TestPath } from 'xstate/graph';
import type { FeedStreamEvent } from './feed-change';
import { feedMachine } from './feed-machine';
import { findQueuedRow } from './feed-row';
import type { FeedRowsJob } from './writer-job';

const firstMessageRowId = 'message-1#0';

// A batch every 60 ms, and open rows written after 1 second.
const streamBatchDelayMs = 60;
const storeDelayMs = 1000;

let batches: FeedStreamEvent[][];
let jobs: FeedRowsJob[];
let logLines: string[];
let feed: Actor<typeof machine>;

const machine = feedMachine.provide({
  actions: {
    sendToWriter: (_, { job }): void => {
      if (job.type !== 'feedRows') throw new Error(`unexpected ${job.type}`);
      jobs.push(job);
    },
    log: (_, { line }): void => {
      logLines.push(line);
    },
  },
});
type FeedSnapshot = SnapshotFrom<typeof machine>;
type FeedMachineEvent = EventFromLogic<typeof machine>;

const input = {
  now: (): number => 1000,
  sessionId: 'session-1',
  epoch: 2,
  maxRevision: 0,
  nextPosition: 0,
  // Rows the mocked writer received come back to a later change.
  findWrittenRow: (id: string): ReturnType<typeof findQueuedRow> =>
    findQueuedRow(jobs, 'session-1', id),
};

// xstate/graph runs no actions, so the model's writer keeps nothing to give back; the example tests cover written rows.
const modelInput = {
  ...input,
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
const openTool = change({
  type: 'upsert',
  update: {
    id: 'tool-1',
    state: 'open',
    sessionUpdate: 'tool_call_update',
    toolCallId: 'tool-1',
    title: 'pnpm test',
    kind: 'execute',
    status: 'in_progress',
    content: [],
  },
});

const streamBatchDelayEvent =
  'xstate.after.streamBatchDelay.feed.active.stream.batching';
const storeDelayEvent = 'xstate.after.storeDelay.feed.active.store.dirty';

// Done events of states are left out: the model would send them before the regions are done.
const events = [
  openMessage,
  appendText,
  settleMessage,
  { type: 'feed.flush' },
  { type: streamBatchDelayEvent },
  { type: storeDelayEvent },
] as AnyEventObject[] as FeedMachineEvent[];

// xstate/graph's types take no emitted events, so the model sees the machine without them.
const graphLogic = machine as unknown as ActorLogic<
  FeedSnapshot,
  FeedMachineEvent,
  typeof modelInput
>;

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

const modelOptions = {
  input: modelInput,
  events,
  // A done actor ignores events, so the model must not send any.
  filterEvents: (snapshot: FeedSnapshot, event: FeedMachineEvent): boolean =>
    snapshot.status === 'active' && snapshot.can(event),
  stateMatcher: (snapshot: FeedSnapshot, key: string): boolean =>
    matchesState(key, snapshot.value),
};
// A vertex for each transition, so the shortest paths reach every transition, back edges too.
const transitionModel = new TestModel(graphLogic, {
  ...modelOptions,
  serializeState: serializeWith((): true => true),
});
// A vertex only for each self-transition, which keeps the simple paths of event orderings under 1,000.
const orderingModel = new TestModel(graphLogic, {
  ...modelOptions,
  serializeState: serializeWith((sameAsPrevious): boolean => sameAsPrevious),
});

const rowIdOf = (event: FeedStreamEvent): string =>
  event.type === 'row.upsert' ? event.row.id : event.id;

// Holds whatever the timers would do, so the order of the two regions' timers stays the model's choice.
const executors: Record<
  string,
  EventExecutor<FeedSnapshot, FeedMachineEvent>
> = {
  'xstate.init': (): void => {
    feed = createActor(machine, { input: modelInput }).start();
    feed.on('feed.batch', ({ events: batch }): void => {
      batches.push(batch);
    });
  },
  ...Object.fromEntries(
    events.map(
      ({
        type,
      }): [
        FeedMachineEvent['type'],
        ({ event }: { event: FeedMachineEvent }) => void,
      ] => [
        type,
        ({ event }: { event: FeedMachineEvent }): void => feed.send(event),
      ],
    ),
  ),
};

// Each accepted change streams once and in order, and the newest version of each row is written or waits to be.
const expectConsistent = (expected: FeedSnapshot): void => {
  const actual = feed.getSnapshot();
  expect(actual.value).toEqual(expected.value);
  expect(actual.status).toBe(expected.status);
  const { context } = actual;

  const streamed = [...batches.flat(), ...context.streamEvents];
  expect(streamed.map((event): number => event.rev)).toEqual(
    Array.from(
      { length: context.maxRevision },
      (_, index): number => index + 1,
    ),
  );

  const newest = new Map(
    streamed.map((event): [string, number] => [rowIdOf(event), event.rev]),
  );
  const written = new Map(
    jobs.flatMap((job): [string, number][] =>
      job.rows.map((row): [string, number] => [row.id, row.revision]),
    ),
  );
  for (const [id, revision] of newest) {
    if (context.changedRowIds.includes(id))
      expect(context.rows[id]?.revision).toBe(revision);
    else expect(written.get(id)).toBe(revision);
  }

  expect(
    Object.values(context.rows).filter(
      (row): boolean => row.state === 'settled',
    ),
  ).toEqual([]);
  expect(jobs.map((job): number => job.maxRevision)).toEqual(
    [...jobs.map((job): number => job.maxRevision)].sort(
      (a, b): number => a - b,
    ),
  );
  expect(logLines).toHaveLength(context.rejectedChanges);
};

const states: Record<string, (snapshot: FeedSnapshot) => void> = {
  'active.stream.quiet': (snapshot): void => {
    expectConsistent(snapshot);
    expect(feed.getSnapshot().context.streamEvents).toEqual([]);
  },
  'active.stream.batching': (snapshot): void => {
    expectConsistent(snapshot);
    expect(feed.getSnapshot().context.streamEvents).not.toEqual([]);
  },
  'active.store.clean': (snapshot): void => {
    expectConsistent(snapshot);
    expect(feed.getSnapshot().context.changedRowIds).toEqual([]);
  },
  'active.store.dirty': (snapshot): void => {
    expectConsistent(snapshot);
    expect(feed.getSnapshot().context.changedRowIds).not.toEqual([]);
  },
  flushed: (snapshot): void => {
    expectConsistent(snapshot);
    const { context } = feed.getSnapshot();
    expect(context.streamEvents).toEqual([]);
    expect(context.changedRowIds).toEqual([]);
  },
};

const shortestPaths = transitionModel.getShortestPaths();
const simplePaths = orderingModel.getSimplePaths();
const title = (path: TestPath<FeedSnapshot, FeedMachineEvent>): string =>
  path.steps
    .map(({ event }): string => {
      if (event.type !== 'feed.change')
        return event.type.replace(/^xstate\.after\.(\w+)\..*$/, 'after $1');
      if (event.change.type === 'upsert') return 'open';
      if (event.change.type === 'append') return 'append';
      return 'settle';
    })
    .join(' → ');

beforeEach((): void => {
  vi.useFakeTimers();
  batches = [];
  jobs = [];
  logLines = [];
});

afterEach((): void => {
  feed.stop();
  vi.useRealTimers();
});

describe('feed model', (): void => {
  describe.each([
    ['shortest path', shortestPaths],
    ['simple path', simplePaths],
  ])('%s', (_, paths): void => {
    it.each(
      paths.map(
        (path): [string, TestPath<FeedSnapshot, FeedMachineEvent>] =>
          [title(path), path] as const,
      ),
    )('%s', async (_, path): Promise<void> => {
      await path.test({ events: executors, states });
    });
  });

  it('the generated paths walk every transition', (): void => {
    expect(
      unwalkedTransitions({
        models: [transitionModel],
        paths: [...shortestPaths, ...simplePaths],
        stateKey: (snapshot): string => JSON.stringify(snapshot.value),
        eventKey: (event): string => JSON.stringify(event),
      }),
    ).toEqual([]);
  });
});

describe('feed', (): void => {
  beforeEach((): void => {
    feed = createActor(machine, { input }).start();
    feed.on('feed.batch', ({ events: batch }): void => {
      batches.push(batch);
    });
  });

  it('streams the changes of 60 ms as one batch', (): void => {
    feed.send(openMessage);
    vi.advanceTimersByTime(30);
    feed.send(appendText);
    vi.advanceTimersByTime(streamBatchDelayMs - 30 - 1);
    expect(batches).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(
      batches.map((batch): ('row.append' | 'row.patch' | 'row.upsert')[] =>
        batch.map((event): typeof event.type => event.type),
      ),
    ).toEqual([['row.upsert', 'row.append']]);
  });

  it('writes open rows 1 second after the first change, in one job', (): void => {
    feed.send(openMessage);
    vi.advanceTimersByTime(500);
    feed.send(openTool);
    feed.send(appendText);
    const activityAt = 1000;
    vi.advanceTimersByTime(storeDelayMs - 500 - 1);
    expect(jobs).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(jobs).toEqual([
      {
        type: 'feedRows',
        sessionId: 'session-1',
        rows: [
          expect.objectContaining({
            id: firstMessageRowId,
            position: 0,
            revision: 3,
          }),
          expect.objectContaining({ id: 'tool-1', position: 1, revision: 2 }),
        ],
        maxRevision: 3,
        activityAt,
        blobIds: [],
      },
    ]);
    expect(Object.keys(feed.getSnapshot().context.rows)).toEqual([
      firstMessageRowId,
      'tool-1',
    ]);
  });

  it('names the blobs a prompt shows in its job', (): void => {
    feed.send(
      change({
        type: 'upsert',
        update: {
          id: 'prompt-1',
          state: 'settled',
          sessionUpdate: 'user_message',
          messageId: 'prompt-1',
          content: [
            {
              type: 'image',
              mimeType: 'image/png',
              blob: { blobId: 'image-1', mime: 'image/png', bytes: 3 },
            },
          ],
        },
      }),
    );

    expect(jobs).toEqual([expect.objectContaining({ blobIds: ['image-1'] })]);
  });

  it('writes at once when a row settles, and keeps only open rows', (): void => {
    feed.send(openTool);
    feed.send(openMessage);
    feed.send(settleMessage);

    expect(jobs).toEqual([
      expect.objectContaining({
        rows: [
          expect.objectContaining({ id: 'tool-1', state: 'open' }),
          expect.objectContaining({
            id: firstMessageRowId,
            state: 'settled',
            revision: 3,
          }),
        ],
        maxRevision: 3,
      }),
    ]);
    expect(Object.keys(feed.getSnapshot().context.rows)).toEqual(['tool-1']);
    vi.advanceTimersByTime(storeDelayMs);
    expect(jobs).toHaveLength(1);
  });

  it('writes when the store timer runs out while a batch waits', (): void => {
    feed.send(openMessage);
    vi.advanceTimersByTime(950);
    feed.send(appendText);
    vi.advanceTimersByTime(50);
    expect(jobs).toHaveLength(1);
    expect(batches).toHaveLength(1);

    vi.advanceTimersByTime(10);
    expect(batches).toHaveLength(2);
  });

  it('flushes the waiting batch and every changed row, then finishes', (): void => {
    feed.send(openTool);
    feed.send(openMessage);
    feed.send({ type: 'feed.flush' });

    expect(batches).toHaveLength(1);
    expect(jobs).toEqual([
      expect.objectContaining({
        rows: [
          expect.objectContaining({ id: 'tool-1', state: 'open' }),
          expect.objectContaining({ id: firstMessageRowId, state: 'open' }),
        ],
        maxRevision: 2,
      }),
    ]);
    expect(feed.getSnapshot().status).toBe('done');
  });

  it('brings a written row back for a later change, in its place', (): void => {
    feed.send(openTool);
    feed.send(openMessage);
    feed.send(settleMessage);
    feed.send(
      change({
        type: 'patch',
        id: firstMessageRowId,
        set: { messageId: 'plan-1' },
      }),
    );

    expect(jobs.at(-1)).toEqual(
      expect.objectContaining({
        rows: [
          expect.objectContaining({
            id: firstMessageRowId,
            position: 1,
            revision: 4,
            state: 'settled',
            turnId: 'turn-1',
          }),
        ],
        maxRevision: 4,
      }),
    );
    expect(feed.getSnapshot().context.nextPosition).toBe(2);
  });

  it('rejects a change when its written row cannot be read, and keeps running', (): void => {
    feed.stop();
    feed = createActor(machine, {
      input: {
        ...input,
        findWrittenRow: (): never => {
          throw new Error('payload does not match agent_message');
        },
      },
    }).start();
    feed.send(appendText);

    expect(logLines).toEqual([
      'rejected a change: could not read written row message-1#0: payload does not match agent_message',
    ]);
    expect(feed.getSnapshot()).toMatchObject({
      status: 'active',
      context: { rejectedChanges: 1 },
    });
  });

  it('logs and counts a rejected change, and streams and writes nothing for it', (): void => {
    feed.send(appendText);
    vi.advanceTimersByTime(storeDelayMs);

    expect(logLines).toEqual(['rejected a change: no row message-1#0']);
    expect(feed.getSnapshot().context.rejectedChanges).toBe(1);
    expect(batches).toEqual([]);
    expect(jobs).toEqual([]);
  });
});
