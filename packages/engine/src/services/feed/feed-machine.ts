import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { FeedChange, SessionUpdate } from '@repo/contracts';
import type { session } from '@repo/db/schema';
import {
  type ActorRefFrom,
  assertEvent,
  assign,
  emit,
  enqueueActions,
  setup,
} from 'xstate';
import { countRejection } from '../../lib/count-rejections';
import {
  applyFeedChange,
  changedRowId,
  type Feed,
  type FeedStreamEvent,
} from './feed-change';
import { promptBlobIds } from './feed-row';
import type { FeedPublication } from './publication';
import { assembleAcpMessage, type MessageStreams } from './updates/messages';
import { settleFeedTurn } from './updates/settlement';
import type { WriterCommit } from './writer-commit';
import type { WriterJob } from './writer-job';
import type { WriterEvent } from './writer-machine';
import { findDatabaseWriter } from './writer-system';

const feedChangeApplied = 'feed.changeApplied';
const feedChangeRejected = 'feed.changeRejected';

type FeedLogParameters = { line: string };

// What the Session reads from its `session` row when it opens.
export interface FeedInput extends Pick<
  typeof session.$inferSelect,
  'epoch' | 'maxRevision'
> {
  sessionId: string;
  now: () => number;
  activityAt?: number;
  // One past the highest stored position.
  nextPosition: number;
  // A row that has left memory, as last handed to the database writer.
  findWrittenRow: (id: string) => SessionUpdate | undefined;
}

export interface FeedContext
  extends Feed, Pick<FeedInput, 'epoch' | 'findWrittenRow' | 'now'> {
  activityAt: number;
  // Rows changed since the last write, in the order they first changed.
  changedRowIds: string[];
  // Stream events waiting for the next batch.
  streamEvents: FeedStreamEvent[];
  rejectedChanges: number;
  messageStreams: MessageStreams;
}

export type FeedEvent =
  | {
      type: 'feed.change';
      change: FeedChange;
      turnId: string | null;
      committed?: WriterCommit;
    }
  | {
      type: 'feed.acpUpdate';
      update: SessionNotification['update'];
      turnId: string | null;
    }
  | { type: 'feed.completeTurn'; turnId: string; published?: FeedPublication }
  | { type: 'feed.flush' };

// Raised after `feed.change` is applied, so each region reacts to it once.
type FeedChangeApplied = {
  type: 'feed.changeApplied';
  settled: boolean;
  committed?: WriterCommit;
};
type FeedChangeRejected = { type: 'feed.changeRejected'; reason: string };
type FeedInternalEvent =
  | FeedChangeApplied
  | FeedChangeRejected
  | { type: 'feed.publish'; published?: FeedPublication };

export type FeedBatch = { type: 'feed.batch'; events: FeedStreamEvent[] };

type WriterJobParameters = Pick<
  Extract<WriterEvent, { type: 'writer.write' }>,
  'job' | 'committed'
>;

// Every changed row with the newest revision, as one job for the database writer.
const createRowsWriteRequest = ({
  context,
  event,
}: {
  context: FeedContext;
  event: FeedEvent | FeedInternalEvent;
}): WriterJobParameters & { job: Extract<WriterJob, { type: 'feedRows' }> } => {
  const rows = context.changedRowIds.flatMap((id): SessionUpdate[] => {
    const row = context.rows[id];
    return row ? [row] : [];
  });
  return {
    committed: 'committed' in event ? event.committed : undefined,
    job: {
      type: 'feedRows',
      sessionId: context.sessionId,
      rows,
      maxRevision: context.maxRevision,
      activityAt: context.activityAt,
      blobIds: promptBlobIds(rows),
    } satisfies WriterJob,
  };
};

const writeRows = [
  { type: 'sendToWriter', params: createRowsWriteRequest },
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
    applyAcpUpdate: enqueueActions(({ context, event, enqueue }): void => {
      assertEvent(event, 'feed.acpUpdate');
      const result = assembleAcpMessage({
        update: event.update,
        turnId: event.turnId,
        feed: context,
        streams: context.messageStreams,
      });
      if (!result) return;
      if ('rejection' in result) {
        enqueue.raise({
          type: feedChangeRejected,
          reason: result.rejection,
        });
        return;
      }
      enqueue.assign({ messageStreams: result.streams });
      enqueue.raise({
        type: 'feed.change',
        change: result.change,
        turnId: event.turnId,
      });
    }),
    settleTurnRows: enqueueActions(({ context, event, enqueue }): void => {
      assertEvent(event, 'feed.completeTurn');
      const result = settleFeedTurn(context, event.turnId);
      if ('rejection' in result) {
        event.published?.reject(new Error(result.rejection));
        enqueue.raise({
          type: feedChangeRejected,
          reason: result.rejection,
        });
        return;
      }
      enqueue.assign({
        rows: result.feed.rows,
        maxRevision: result.feed.maxRevision,
        nextPosition: result.feed.nextPosition,
        streamEvents: [...context.streamEvents, ...result.events],
        changedRowIds: [
          ...new Set([
            ...context.changedRowIds,
            ...result.events.map((change) =>
              change.type === 'row.upsert' ? change.row.id : change.id,
            ),
          ]),
        ],
      });
      enqueue.assign({
        messageStreams: Object.fromEntries(
          Object.entries(context.messageStreams).filter(
            ([, stream]) => stream.turnId !== event.turnId,
          ),
        ),
      });
      if (result.events.length > 0)
        enqueue.raise({ type: feedChangeApplied, settled: true });
      enqueue.raise({ type: 'feed.publish', published: event.published });
    }),
    acknowledgePublication: ({ event }): void => {
      assertEvent(event, 'feed.publish');
      event.published?.resolve();
    },
    applyChange: enqueueActions(({ context, event, enqueue }): void => {
      assertEvent(event, 'feed.change');
      const id = changedRowId(event.change);
      const { sessionId, maxRevision, nextPosition } = context;
      // A written row comes back with its position, so a later change keeps its place.
      let written: SessionUpdate | undefined;
      if (!Object.hasOwn(context.rows, id))
        try {
          written = context.findWrittenRow(id);
        } catch (error) {
          event.committed?.reject(error);
          enqueue.raise({
            type: feedChangeRejected,
            reason: `could not read written row ${id}: ${error instanceof Error ? error.message : String(error)}`,
          });
          return;
        }
      const result = applyFeedChange(
        {
          sessionId,
          maxRevision,
          nextPosition,
          rows: written ? { ...context.rows, [id]: written } : context.rows,
        },
        event.change,
        event.turnId,
      );
      if ('rejection' in result) {
        event.committed?.reject(new Error(result.rejection));
        enqueue.raise({
          type: feedChangeRejected,
          reason: result.rejection,
        });
        return;
      }
      const { feed, streamEvent } = result;
      enqueue.assign({
        ...feed,
        activityAt: context.now(),
        changedRowIds: context.changedRowIds.includes(id)
          ? context.changedRowIds
          : [...context.changedRowIds, id],
        streamEvents: [...context.streamEvents, streamEvent],
      });
      enqueue.raise({
        type: feedChangeApplied,
        settled: feed.rows[id]?.state === 'settled',
        committed: event.committed,
      });
    }),
    countRejectedChange: assign({
      rejectedChanges: ({ context }): number =>
        countRejection(context.rejectedChanges),
    }),
    emitBatch: emit(({ context }): FeedBatch => ({
      type: 'feed.batch' as const,
      events: context.streamEvents,
    })),
    clearBatch: assign({ streamEvents: [] }),
    sendToWriter: ({ system }, params: WriterJobParameters): void => {
      const writer = findDatabaseWriter(system);
      if (writer?.getSnapshot().status !== 'active') {
        params.committed?.reject(new Error('Database Writer is unavailable'));
        return;
      }
      writer.send({ type: 'writer.write', ...params });
    },
    // Settled rows leave memory once written; open rows stay for their next change.
    dropWrittenRows: assign({
      rows: ({ context }): FeedContext['rows'] =>
        Object.fromEntries(
          Object.entries(context.rows).filter(
            ([, row]): boolean => row.state === 'open',
          ),
        ),
      changedRowIds: [],
    }),
    log: ({ context }, params: FeedLogParameters): void => {
      console.error(`feed ${context.sessionId}: ${params.line}`);
    },
  },
  guards: {
    changeSettled: ({ event }): boolean =>
      event.type === 'feed.changeApplied' && event.settled,
    hasStreamEvents: ({ context }): boolean => context.streamEvents.length > 0,
    hasChangedRows: ({ context }): boolean => context.changedRowIds.length > 0,
  },
  delays: { streamBatchDelay: 60, storeDelay: 1000 },
}).createMachine({
  id: 'feed',
  context: ({ input }): FeedContext => ({
    ...input,
    activityAt: input.activityAt ?? 0,
    rows: {},
    changedRowIds: [],
    streamEvents: [],
    rejectedChanges: 0,
    messageStreams: {},
  }),
  initial: 'active',
  states: {
    active: {
      type: 'parallel',
      on: {
        'feed.acpUpdate': { actions: 'applyAcpUpdate' },
        'feed.completeTurn': { actions: 'settleTurnRows' },
        'feed.change': { actions: 'applyChange' },
        'feed.changeRejected': {
          actions: [
            'countRejectedChange',
            {
              type: 'log',
              params: ({ event }): FeedLogParameters => ({
                line: `rejected a change: ${event.reason}`,
              }),
            },
          ],
        },
        // Emits the waiting batch and writes every changed row, open or settled.
        'feed.flush': {
          target: 'flushed',
          actions: enqueueActions(({ enqueue, check }): void => {
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
          on: {
            'feed.publish': {
              target: '.quiet',
              actions: ['emitBatch', 'clearBatch', 'acknowledgePublication'],
            },
          },
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
