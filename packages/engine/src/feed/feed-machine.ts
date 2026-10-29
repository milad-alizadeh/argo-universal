import { emptyChangesSummary } from '@repo/contracts';
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
import { databaseWriterId, writerMachine } from '../storage';
import { prepareAcpFeedApplication } from './acp/application';
import { settledEditRefresh } from './changes-refresh';
import { prepareFeedApplication } from './feed-application';
import type {
  FeedBatch,
  FeedContext,
  FeedEvent,
  FeedInput,
  FeedInternalEvent,
} from './feed-machine-types';
import { prepareTurnSettlement } from './feed-turn-settlement';
import {
  createRowsWriteRequest,
  rejectUnavailableWriter,
  type WriterJobParameters,
} from './feed-write-request';
import {
  sessionRowChanges,
  sessionRowEvents,
  sessionRowTransitions,
} from './session-rows';

export type {
  FeedBatch,
  FeedContext,
  FeedEvent,
  FeedInput,
  FeedInternalEvent,
} from './feed-machine-types';

const feedChangeRejected = 'feed.changeRejected';

type FeedLogParameters = { line: string };

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

export const streamBatchDelay = 60;

export const storeDelay = 1000;

export const feedMachine = setup({
  // SAFETY: XState v5 reads these as type-only declarations; the empty objects are never used as runtime values.
  types: {
    input: {} as FeedInput,
    context: {} as FeedContext,
    events: {} as FeedEvent | FeedInternalEvent,
    emitted: {} as FeedBatch,
  },
  actions: {
    writeSessionRows: enqueueActions(({ context, event, enqueue }): void => {
      assertEvent(event, sessionRowEvents);

      for (const change of sessionRowChanges(context, event))
        enqueue.raise(change);
    }),
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

      raiseFeedEvents(settledEditRefresh(event, result.state.rows), (raised) =>
        enqueue.raise(raised),
      );
    }),
    settleTurnRows: enqueueActions(({ context, event, enqueue }): void => {
      assertEvent(event, 'feed.completeTurn');
      const result = prepareTurnSettlement(context, event);

      if (result.state) {
        enqueue.assign(result.state);
        enqueue.raise({ type: 'feed.refreshChanges' });
      }

      raiseFeedEvents(result.events, (raised) => enqueue.raise(raised));
    }),
    refreshChanges: enqueueActions(({ context, self, enqueue }): void => {
      if (!context.refreshChanges) return;

      const request = context.changesRequest + 1;

      enqueue.assign({ changesRequest: request });
      void context.refreshChanges().then(
        (summary): void => {
          if (self.getSnapshot().status === 'active')
            self.send({ type: 'feed.changesRefreshed', request, summary });
        },
        (): void => {},
      );
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
  delays: { streamBatchDelay, storeDelay },
}).createMachine({
  id: 'feed',
  context: ({ input }): FeedContext => ({
    ...input,
    activityAt: input.activityAt ?? 0,
    lastSettledTurnId: null,
    rows: input.rows ?? {},
    changedRowIds: [],
    streamEvents: [],
    rejectedChanges: 0,
    messageStreams: {},
    toolContents: {},
    outputBlobs: [],
    changes: emptyChangesSummary,
    changesRequest: 0,
  }),
  initial: 'active',
  states: {
    active: {
      type: 'parallel',
      entry: 'refreshChanges',
      on: {
        'feed.acpUpdate': { actions: 'applyAcpUpdate' },
        'feed.completeTurn': { actions: 'settleTurnRows' },
        'feed.refreshChanges': { actions: 'refreshChanges' },
        'feed.changesRefreshed': {
          guard: ({ context, event }): boolean =>
            event.request === context.changesRequest,
          actions: assign({ changes: ({ event }) => event.summary }),
        },
        ...sessionRowTransitions,
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
