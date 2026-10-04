import type { FeedChange, SessionUpdate } from '@repo/contracts';
import {
  type ActorRefFrom,
  assertEvent,
  assign,
  emit,
  enqueueActions,
  sendTo,
  setup,
} from 'xstate';
import {
  applyFeedChange,
  changedRowId,
  type Feed,
  type FeedStreamEvent,
} from './feed-change';
import { toFeedRowWrite } from './feed-row';
import type { WriterJob } from './writer-job';
import type { WriterEvent } from './writer-machine';

// What the Session reads from its `session` row when it opens.
export interface FeedInput {
  sessionId: string;
  epoch: number;
  maxRevision: number;
  nextPosition: number;
  // A row that has left memory, as last handed to the database writer.
  findWrittenRow: (id: string) => SessionUpdate | undefined;
}

export interface FeedContext
  extends Feed,
    Pick<FeedInput, 'epoch' | 'findWrittenRow'> {
  // Rows changed since the last write, in the order they first changed.
  changedRowIds: string[];
  // Stream events waiting for the next batch.
  streamEvents: FeedStreamEvent[];
  rejectedChanges: number;
}

export type FeedEvent =
  | { type: 'feed.change'; change: FeedChange; turnId: string | null }
  | { type: 'feed.flush' };

// Raised after `feed.change` is applied, so each region reacts to it once.
type FeedChangeApplied = { type: 'feed.changeApplied'; settled: boolean };
type FeedChangeRejected = { type: 'feed.changeRejected'; reason: string };
type FeedInternalEvent = FeedChangeApplied | FeedChangeRejected;

export type FeedBatch = { type: 'feed.batch'; events: FeedStreamEvent[] };

// Every changed row with the newest revision, as one job for the database writer.
const rowsJob = ({ context }: { context: FeedContext }) => ({
  job: {
    type: 'feedRows',
    sessionId: context.sessionId,
    rows: context.changedRowIds.flatMap((id) => {
      const row = context.rows[id];
      return row ? [toFeedRowWrite(row)] : [];
    }),
    maxRevision: context.maxRevision,
  } satisfies WriterJob,
});

const writeRows = [
  { type: 'sendToWriter', params: rowsJob },
  'dropWrittenRows',
] as const;

export const feedMachine = setup({
  types: {
    input: {} as FeedInput,
    context: {} as FeedContext,
    events: {} as FeedEvent | FeedInternalEvent,
    emitted: {} as FeedBatch,
  },
  actions: {
    applyChange: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, 'feed.change');
      const id = changedRowId(event.change);
      const { sessionId, maxRevision, nextPosition } = context;
      // A written row comes back with its position, so a later change keeps its place.
      const written = Object.hasOwn(context.rows, id)
        ? undefined
        : context.findWrittenRow(id);
      const { feed, streamEvents, rejection } = applyFeedChange(
        {
          sessionId,
          maxRevision,
          nextPosition,
          rows: written ? { ...context.rows, [id]: written } : context.rows,
        },
        event.change,
        event.turnId,
      );
      if (rejection !== null) {
        enqueue.raise({ type: 'feed.changeRejected', reason: rejection });
        return;
      }
      enqueue.assign({
        ...feed,
        changedRowIds: context.changedRowIds.includes(id)
          ? context.changedRowIds
          : [...context.changedRowIds, id],
        streamEvents: [...context.streamEvents, ...streamEvents],
      });
      enqueue.raise({
        type: 'feed.changeApplied',
        settled: feed.rows[id]?.state === 'settled',
      });
    }),
    countRejectedChange: assign({
      rejectedChanges: ({ context }) => context.rejectedChanges + 1,
    }),
    emitBatch: emit(({ context }) => ({
      type: 'feed.batch' as const,
      events: context.streamEvents,
    })),
    clearBatch: assign({ streamEvents: [] }),
    sendToWriter: sendTo(
      ({ system }) => system.get('databaseWriter'),
      (_, params: { job: WriterJob }): WriterEvent => ({
        type: 'writer.write',
        job: params.job,
      }),
    ),
    // Settled rows leave memory once written; open rows stay for their next change.
    dropWrittenRows: assign({
      rows: ({ context }) =>
        Object.fromEntries(
          Object.entries(context.rows).filter(
            ([, row]) => row.state === 'open',
          ),
        ),
      changedRowIds: [],
    }),
    log: ({ context }, params: { line: string }) => {
      console.error(`feed ${context.sessionId}: ${params.line}`);
    },
  },
  guards: {
    changeSettled: ({ event }) =>
      event.type === 'feed.changeApplied' && event.settled,
    hasStreamEvents: ({ context }) => context.streamEvents.length > 0,
    hasChangedRows: ({ context }) => context.changedRowIds.length > 0,
  },
  delays: { streamBatchDelay: 60, storeDelay: 1000 },
}).createMachine({
  id: 'feed',
  context: ({ input }) => ({
    ...input,
    rows: {},
    changedRowIds: [],
    streamEvents: [],
    rejectedChanges: 0,
  }),
  initial: 'active',
  states: {
    active: {
      type: 'parallel',
      on: {
        'feed.change': { actions: 'applyChange' },
        'feed.changeRejected': {
          actions: [
            'countRejectedChange',
            {
              type: 'log',
              params: ({ event }) => {
                assertEvent(event, 'feed.changeRejected');
                return { line: `rejected a change: ${event.reason}` };
              },
            },
          ],
        },
        // Emits the waiting batch and writes every changed row, open or settled.
        'feed.flush': {
          target: 'flushed',
          actions: enqueueActions(({ enqueue, check }) => {
            if (check('hasStreamEvents')) {
              enqueue('emitBatch');
              enqueue('clearBatch');
            }
            if (check('hasChangedRows'))
              for (const action of writeRows) enqueue(action);
          }),
        },
      },
      states: {
        // Sends the changes of each 60 ms to `feed.subscribe`.
        stream: {
          initial: 'quiet',
          states: {
            quiet: { on: { 'feed.changeApplied': 'batching' } },
            batching: {
              after: {
                streamBatchDelay: {
                  target: 'quiet',
                  actions: ['emitBatch', 'clearBatch'],
                },
              },
            },
          },
        },
        // Writes at once when a row settles, and a second after an open row changes.
        store: {
          initial: 'clean',
          states: {
            clean: {
              on: {
                'feed.changeApplied': [
                  { guard: 'changeSettled', actions: writeRows },
                  { target: 'dirty' },
                ],
              },
            },
            dirty: {
              after: { storeDelay: { target: 'clean', actions: writeRows } },
              on: {
                'feed.changeApplied': {
                  guard: 'changeSettled',
                  target: 'clean',
                  actions: writeRows,
                },
              },
            },
          },
        },
      },
    },
    flushed: { type: 'final' },
  },
});

export type FeedActorRef = ActorRefFrom<typeof feedMachine>;
