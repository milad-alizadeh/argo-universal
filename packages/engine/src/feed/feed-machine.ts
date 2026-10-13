import type { FeedChange, PlanUpdate, SessionUpdate } from '@repo/contracts';
import type { session } from '@repo/db/schema';
import { countRejection } from '@repo/machine-log';
import {
  type ActorRefFrom,
  assertEvent,
  assign,
  emit,
  enqueueActions,
  setup,
} from 'xstate';
import { findMachineActor } from '../lib/machine-actor';
import { databaseWriterId, type WriterCommit, writerMachine } from '../storage';
import { prepareAcpFeedApplication } from './acp/application';
import type { MessageStreams } from './acp/message-identity';
import type { AcpSessionNotification as SessionNotification } from './acp/session-notification';
import type { OutputBlob } from './acp/tool-output';
import { prepareFeedApplication } from './feed-application';
import { type Feed, type FeedStreamEvent } from './feed-change';
import { prepareTurnSettlement } from './feed-turn-settlement';
import {
  createRowsWriteRequest,
  type WriterJobParameters,
} from './feed-write-request';
import type { FeedPublication } from './publication';

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
  findUnaddressedPlan?: (acpSessionId: string) => PlanUpdate | undefined;
  // Called when the database writer refuses this Feed's rows because storage is failing.
  storageFailing?: () => void;
}

export interface FeedContext
  extends
    Feed,
    Pick<
      FeedInput,
      | 'epoch'
      | 'findWrittenRow'
      | 'findUnaddressedPlan'
      | 'now'
      | 'storageFailing'
    > {
  activityAt: number;
  // Rows changed since the last write, in the order they first changed.
  changedRowIds: string[];
  // Stream events waiting for the next batch.
  streamEvents: FeedStreamEvent[];
  rejectedChanges: number;
  messageStreams: MessageStreams;
  // Whole tool output cut to a preview since the last write.
  outputBlobs: OutputBlob[];
  unaddressedPlan?: { acpSessionId: string; rowId: string };
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
      acpSessionId: SessionNotification['sessionId'];
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
export type FeedInternalEvent =
  | FeedChangeApplied
  | FeedChangeRejected
  | { type: 'feed.publish'; published?: FeedPublication };

export type FeedBatch = { type: 'feed.batch'; events: FeedStreamEvent[] };

const rejectUnavailableWriter = (params: WriterJobParameters): void => {
  params.committed?.reject(new Error('Database Writer is unavailable'));
};

const writeRows = [
  { type: 'sendToWriter', params: createRowsWriteRequest },
  'dropWrittenRows',
] as const;

const raiseFeedEvents = (
  events: FeedInternalEvent[],
  raise: (event: FeedInternalEvent) => void,
): void => {
  for (const event of events) raise(event);
};
const enqueueWriteRows = (
  enqueue: (action: (typeof writeRows)[number]) => void,
): void => {
  for (const action of writeRows) enqueue(action);
};

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
      const result = prepareAcpFeedApplication(context, event);
      if (!result) return;
      if ('rejection' in result)
        return enqueue.raise({
          type: feedChangeRejected,
          reason: result.rejection,
        });
      enqueue.assign(result.state);
      raiseFeedEvents(result.events, (raised) => enqueue.raise(raised));
    }),
    settleTurnRows: enqueueActions(({ context, event, enqueue }): void => {
      assertEvent(event, 'feed.completeTurn');
      const result = prepareTurnSettlement(context, event);
      if (result.state) enqueue.assign(result.state);
      raiseFeedEvents(result.events, (raised) => enqueue.raise(raised));
    }),
    acknowledgePublication: ({ event }): void => {
      assertEvent(event, 'feed.publish');
      event.published?.resolve();
    },
    applyChange: enqueueActions(({ context, event, enqueue }): void => {
      assertEvent(event, 'feed.change');
      const result = prepareFeedApplication(context, event);
      if (result.state) enqueue.assign(result.state);
      raiseFeedEvents(result.events, (raised) => enqueue.raise(raised));
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
      const writer = findMachineActor(system, databaseWriterId, writerMachine);
      if (!writer || writer.getSnapshot().status !== 'active') {
        rejectUnavailableWriter(params);
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
      outputBlobs: [],
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
    outputBlobs: [],
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
              enqueueWriteRows((action) => enqueue(action));
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
