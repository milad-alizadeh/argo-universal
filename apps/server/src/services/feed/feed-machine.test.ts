import type { FeedChange } from '@repo/contracts';
import { expectEveryTransitionWalked } from '@repo/vitest/model-coverage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Actor,
  type ActorLogic,
  type AnyEventObject,
  createActor,
  type EventFromLogic,
  type SnapshotFrom,
} from 'xstate';
import { type EventExecutor, TestModel, type TestPath } from 'xstate/graph';
import type { FeedStreamEvent } from './feed-change';
import { feedMachine } from './feed-machine';
import { type FeedRowsJob, findQueuedRow } from './feed-row';

// Spec 0002 section 8: a batch every 60 ms, and open rows written after 1 second.
const streamBatchDelayMs = 60;
const storeDelayMs = 1000;

let batches: FeedStreamEvent[][];
let jobs: FeedRowsJob[];
let logLines: string[];
let feed: Actor<typeof machine>;

const machine = feedMachine.provide({
  actions: {
    sendToWriter: (_, { job }) => {
      if (job.type !== 'feedRows') throw new Error(`unexpected ${job.type}`);
      jobs.push(job);
    },
    log: (_, { line }) => {
      logLines.push(line);
    },
  },
});
type FeedSnapshot = SnapshotFrom<typeof machine>;
type FeedMachineEvent = EventFromLogic<typeof machine>;

const input = {
  sessionId: 'session-1',
  epoch: 2,
  maxRevision: 0,
  nextPosition: 0,
  // Rows the mocked writer received come back to a later change.
  findWrittenRow: (id: string) => findQueuedRow(jobs, 'session-1', id),
};

// xstate/graph runs no actions, so the model's writer keeps nothing to give back; the example tests cover written rows.
const modelInput = { ...input, findWrittenRow: () => undefined };

const change = (feedChange: FeedChange) =>
  ({ type: 'feed.change', change: feedChange, turnId: 'turn-1' }) as const;
const openMessage = change({
  type: 'upsert',
  update: {
    id: 'message-1#0',
    state: 'open',
    sessionUpdate: 'agent_message',
    messageId: 'message-1',
    content: [{ type: 'text', text: '' }],
  },
});
const appendText = change({
  type: 'append',
  id: 'message-1#0',
  field: 'content.0.text',
  text: 'a',
});
const settleMessage = change({
  type: 'patch',
  id: 'message-1#0',
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
  (via: (sameAsPrevious: boolean) => boolean) =>
  (
    snapshot: FeedSnapshot,
    event: FeedMachineEvent | undefined,
    previous: FeedSnapshot | undefined,
  ) => {
    const vertex = (of: FeedSnapshot | undefined) =>
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
  filterEvents: (snapshot: FeedSnapshot, event: FeedMachineEvent) =>
    snapshot.status === 'active' && snapshot.can(event),
  stateMatcher: (snapshot: FeedSnapshot, key: string) =>
    snapshot.matches(key as never),
};
// A vertex for each transition, so the shortest paths reach every transition, back edges too.
const transitionModel = new TestModel(graphLogic, {
  ...modelOptions,
  serializeState: serializeWith(() => true),
});
// A vertex only for each self-transition, which keeps the simple paths of event orderings under 1,000.
const orderingModel = new TestModel(graphLogic, {
  ...modelOptions,
  serializeState: serializeWith((sameAsPrevious) => sameAsPrevious),
});

const rowIdOf = (event: FeedStreamEvent) =>
  event.type === 'row.upsert' ? event.row.id : event.id;

// Holds whatever the timers would do, so the order of the two regions' timers stays the model's choice.
const executors: Record<
  string,
  EventExecutor<FeedSnapshot, FeedMachineEvent>
> = {
  'xstate.init': () => {
    feed = createActor(machine, { input: modelInput }).start();
    feed.on('feed.batch', ({ events: batch }) => {
      batches.push(batch);
    });
  },
  ...Object.fromEntries(
    events.map(({ type }) => [
      type,
      ({ event }: { event: FeedMachineEvent }) => feed.send(event),
    ]),
  ),
};

// Each accepted change streams once and in order, and the newest version of each row is written or waits to be.
const expectConsistent = (expected: FeedSnapshot) => {
  const actual = feed.getSnapshot();
  expect(actual.value).toEqual(expected.value);
  expect(actual.status).toBe(expected.status);
  const { context } = actual;

  const streamed = [...batches.flat(), ...context.streamEvents];
  expect(streamed.map((event) => event.rev)).toEqual(
    Array.from({ length: context.maxRevision }, (_, index) => index + 1),
  );

  const newest = new Map(streamed.map((event) => [rowIdOf(event), event.rev]));
  const written = new Map(
    jobs.flatMap((job) => job.rows.map((row) => [row.id, row.revision])),
  );
  for (const [id, revision] of newest) {
    if (context.changedRowIds.includes(id))
      expect(context.rows[id]?.revision).toBe(revision);
    else expect(written.get(id)).toBe(revision);
  }

  expect(
    Object.values(context.rows).filter((row) => row.state === 'settled'),
  ).toEqual([]);
  expect(jobs.map((job) => job.maxRevision)).toEqual(
    [...jobs.map((job) => job.maxRevision)].sort((a, b) => a - b),
  );
  expect(logLines).toHaveLength(context.rejectedChanges);
};

const states: Record<string, (snapshot: FeedSnapshot) => void> = {
  'active.stream.quiet': (snapshot) => {
    expectConsistent(snapshot);
    expect(feed.getSnapshot().context.streamEvents).toEqual([]);
  },
  'active.stream.batching': (snapshot) => {
    expectConsistent(snapshot);
    expect(feed.getSnapshot().context.streamEvents).not.toEqual([]);
  },
  'active.store.clean': (snapshot) => {
    expectConsistent(snapshot);
    expect(feed.getSnapshot().context.changedRowIds).toEqual([]);
  },
  'active.store.dirty': (snapshot) => {
    expectConsistent(snapshot);
    expect(feed.getSnapshot().context.changedRowIds).not.toEqual([]);
  },
  flushed: (snapshot) => {
    expectConsistent(snapshot);
    const { context } = feed.getSnapshot();
    expect(context.streamEvents).toEqual([]);
    expect(context.changedRowIds).toEqual([]);
  },
};

const shortestPaths = transitionModel.getShortestPaths();
const simplePaths = orderingModel.getSimplePaths();
const title = (path: TestPath<FeedSnapshot, FeedMachineEvent>) =>
  path.steps
    .map(({ event }) => {
      if (event.type !== 'feed.change')
        return event.type.replace(/^xstate\.after\.(\w+)\..*$/, 'after $1');
      if (event.change.type === 'upsert') return 'open';
      if (event.change.type === 'append') return 'append';
      return 'settle';
    })
    .join(' → ');

beforeEach(() => {
  vi.useFakeTimers();
  batches = [];
  jobs = [];
  logLines = [];
});

afterEach(() => {
  feed.stop();
  vi.useRealTimers();
});

describe('feed model', () => {
  describe.each([
    ['shortest path', shortestPaths],
    ['simple path', simplePaths],
  ])('%s', (_, paths) => {
    it.each(paths.map((path) => [title(path), path] as const))(
      '%s',
      async (_, path) => {
        await path.test({ events: executors, states });
      },
    );
  });

  it('the generated paths walk every transition', () => {
    expectEveryTransitionWalked({
      models: [transitionModel],
      paths: [...shortestPaths, ...simplePaths],
      stateKey: (snapshot) => JSON.stringify(snapshot.value),
      eventKey: (event) => JSON.stringify(event),
    });
  });
});

describe('feed', () => {
  beforeEach(() => {
    feed = createActor(machine, { input }).start();
    feed.on('feed.batch', ({ events: batch }) => {
      batches.push(batch);
    });
  });

  it('streams the changes of 60 ms as one batch', () => {
    feed.send(openMessage);
    vi.advanceTimersByTime(30);
    feed.send(appendText);
    vi.advanceTimersByTime(streamBatchDelayMs - 30 - 1);
    expect(batches).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(batches.map((batch) => batch.map((event) => event.type))).toEqual([
      ['row.upsert', 'row.append'],
    ]);
  });

  it('writes open rows 1 second after the first change, in one job', () => {
    feed.send(openMessage);
    vi.advanceTimersByTime(500);
    feed.send(openTool);
    feed.send(appendText);
    const activityAt = Date.now();
    vi.advanceTimersByTime(storeDelayMs - 500 - 1);
    expect(jobs).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(jobs).toEqual([
      {
        type: 'feedRows',
        sessionId: 'session-1',
        rows: [
          expect.objectContaining({
            id: 'message-1#0',
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
      'message-1#0',
      'tool-1',
    ]);
  });

  it('names the blobs a prompt shows in its job', () => {
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

  it('writes at once when a row settles, and keeps only open rows', () => {
    feed.send(openTool);
    feed.send(openMessage);
    feed.send(settleMessage);

    expect(jobs).toEqual([
      expect.objectContaining({
        rows: [
          expect.objectContaining({ id: 'tool-1', state: 'open' }),
          expect.objectContaining({
            id: 'message-1#0',
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

  it('writes when the store timer runs out while a batch waits', () => {
    feed.send(openMessage);
    vi.advanceTimersByTime(950);
    feed.send(appendText);
    vi.advanceTimersByTime(50);
    expect(jobs).toHaveLength(1);
    expect(batches).toHaveLength(1);

    vi.advanceTimersByTime(10);
    expect(batches).toHaveLength(2);
  });

  it('flushes the waiting batch and every changed row, then finishes', () => {
    feed.send(openTool);
    feed.send(openMessage);
    feed.send({ type: 'feed.flush' });

    expect(batches).toHaveLength(1);
    expect(jobs).toEqual([
      expect.objectContaining({
        rows: [
          expect.objectContaining({ id: 'tool-1', state: 'open' }),
          expect.objectContaining({ id: 'message-1#0', state: 'open' }),
        ],
        maxRevision: 2,
      }),
    ]);
    expect(feed.getSnapshot().status).toBe('done');
  });

  it('brings a written row back for a later change, in its place', () => {
    feed.send(openTool);
    feed.send(openMessage);
    feed.send(settleMessage);
    feed.send(
      change({
        type: 'patch',
        id: 'message-1#0',
        set: { messageId: 'plan-1' },
      }),
    );

    expect(jobs.at(-1)).toEqual(
      expect.objectContaining({
        rows: [
          expect.objectContaining({
            id: 'message-1#0',
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

  it('rejects a change when its written row cannot be read, and keeps running', () => {
    feed.stop();
    feed = createActor(machine, {
      input: {
        ...input,
        findWrittenRow: () => {
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

  it('logs and counts a rejected change, and streams and writes nothing for it', () => {
    feed.send(appendText);
    vi.advanceTimersByTime(storeDelayMs);

    expect(logLines).toEqual(['rejected a change: no row message-1#0']);
    expect(feed.getSnapshot().context.rejectedChanges).toBe(1);
    expect(batches).toEqual([]);
    expect(jobs).toEqual([]);
  });
});
