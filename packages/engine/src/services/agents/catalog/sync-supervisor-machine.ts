import { assign, sendTo, setup, spawnChild, stopChild, stateIn } from 'xstate';
import { catalogSyncMachine } from './catalog-sync-machine';
import {
  catalogSqlActors,
  readPendingSyncIds,
  type SyncSupervisorInput,
  type SyncSupervisorContext,
  type SyncSupervisorEvent,
} from './sync-supervisor-sql';
export type { SyncSupervisorInput } from './sync-supervisor-sql';
const finishJoin = ['stopJoins', 'dropJoinBatch'] as const;
const finishWorker = ['rememberAbandonedWorker', 'stopWorker'] as const;
export const syncSupervisorMachine = setup({
  types: {
    input: {} as SyncSupervisorInput,
    context: {} as SyncSupervisorContext,
    events: {} as SyncSupervisorEvent,
  },
  actors: {
    catalogWorker: catalogSyncMachine,
    ...catalogSqlActors,
  },
  guards: {
    joinsFinished: ({ context }) =>
      context.joinBatchSize === 0 && context.joinRequestIds.length === 0,
    moreJoins: ({ context }) =>
      context.joinRequestIds.length > context.joinBatchSize,
    noJoinRunning: ({ context }) => context.joinBatchSize === 0,
    unresolvedSyncs: ({ context }) => context.abandonedSyncIds.length > 0,
    queuedJoins: ({ context }) => context.joinRequestIds.length > 0,
    hasExplicitRequest: ({ context }) => context.syncId !== '',
    startupShutdownRequested: stateIn({ recovering: 'shutdownRequested' }),
    cleanupShutdownRequested: stateIn({
      cleaningAbandoned: 'shutdownRequested',
    }),
  },
  actions: {
    rejectWaitingSqlObservers: sendTo(
      ({ context }) => context.writer,
      ({ context, event }) => ({
        type: 'writer.catalogStorageFailed',
        requestIds: [context.syncId, ...context.joinRequestIds],
        error:
          'error' in event
            ? event.error
            : new Error('Catalog storage is unavailable'),
      }),
    ),
    rememberRequest: assign(({ event }) =>
      event.type === 'catalog.requested'
        ? { syncId: event.requestId, joinRequestIds: [] }
        : {},
    ),
    enqueueJoin: assign(({ context, event }) =>
      event.type === 'catalog.requested'
        ? { joinRequestIds: [...context.joinRequestIds, event.requestId] }
        : {},
    ),
    takeJoinBatch: assign({
      joinBatchSize: ({ context }) => context.joinRequestIds.length,
    }),
    startJoins: spawnChild('joinRequests', {
      id: 'catalogJoins',
      input: ({ context }) => ({
        ...context,
        requestIds: context.joinRequestIds.slice(0, context.joinBatchSize),
      }),
    }),
    stopJoins: stopChild('catalogJoins'),
    dropJoinBatch: assign({
      joinRequestIds: ({ context }) =>
        context.joinRequestIds.slice(context.joinBatchSize),
      joinBatchSize: 0,
    }),
    rememberAbandonedJoin: assign({
      abandonedSyncIds: ({ context }) => [
        ...context.abandonedSyncIds,
        ...context.joinRequestIds.slice(0, context.joinBatchSize),
      ],
    }),
    startWorker: spawnChild('catalogWorker', {
      id: 'catalogWorker',
      input: ({ context }) => context,
    }),
    stopWorker: stopChild('catalogWorker'),
    cancelWorkerFetch: sendTo('catalogWorker', { type: 'catalog.cancel' }),
    rememberAbandonedWorker: assign(({ context, event }) =>
      event.type === 'xstate.done.actor.catalogWorker' && event.output.abandoned
        ? { abandonedSyncIds: [...context.abandonedSyncIds, context.syncId] }
        : {},
    ),
    rememberPendingSqlGroups: assign({
      abandonedSyncIds: ({ context }) => readPendingSyncIds(context.database),
    }),
    abandonWaitingRequests: assign({
      abandonedSyncIds: ({ context }) => [
        ...context.abandonedSyncIds,
        context.syncId,
        ...context.joinRequestIds,
      ],
      joinRequestIds: [],
      joinBatchSize: 0,
    }),
    clearAbandonedSyncs: assign({ abandonedSyncIds: [] }),
  },
}).createMachine({
  id: 'syncSupervisor',
  context: ({ input }) => ({
    ...input,
    syncId: '',
    joinRequestIds: [],
    joinBatchSize: 0,
    abandonedSyncIds: [],
  }),
  initial: 'recovering',
  on: {
    'xstate.done.actor.catalogJoins': [
      {
        guard: 'moreJoins',
        actions: [...finishJoin, 'takeJoinBatch', 'startJoins'],
      },
      { actions: finishJoin },
    ],
    'xstate.error.actor.catalogJoins': [
      {
        guard: 'moreJoins',
        actions: [
          'rememberAbandonedJoin',
          ...finishJoin,
          'takeJoinBatch',
          'startJoins',
        ],
      },
      { actions: ['rememberAbandonedJoin', ...finishJoin] },
    ],
  },
  states: {
    recovering: {
      initial: 'continuing',
      states: {
        continuing: { on: { 'catalog.shutdown': 'shutdownRequested' } },
        shutdownRequested: {},
      },
      on: {
        'catalog.requested': [
          { guard: 'hasExplicitRequest', actions: 'enqueueJoin' },
          { actions: 'rememberRequest' },
        ],
      },
      invoke: {
        id: 'recoverCatalogRequests',
        src: 'recoverCatalogSql',
        input: ({ context }) => ({
          ...context,
          syncIds: null,
          waitingRequestIds: [],
        }),
        onDone: [
          { guard: 'startupShutdownRequested', target: 'interruptingShutdown' },
          {
            guard: 'queuedJoins',
            target: 'syncing',
            actions: ['startWorker', 'takeJoinBatch', 'startJoins'],
          },
          {
            guard: 'hasExplicitRequest',
            target: 'syncing',
            actions: 'startWorker',
          },
          { target: 'idle' },
        ],
        onError: [
          { guard: 'startupShutdownRequested', target: 'interruptionFailed' },
          { target: 'idle', actions: 'rememberPendingSqlGroups' },
        ],
      },
    },
    idle: {
      on: {
        'catalog.requested': [
          {
            guard: 'unresolvedSyncs',
            target: 'cleaningAbandoned',
            actions: 'rememberRequest',
          },
          { target: 'syncing', actions: ['rememberRequest', 'startWorker'] },
        ],
        'catalog.shutdown': 'interruptingShutdown',
      },
    },
    cleaningAbandoned: {
      initial: 'continuing',
      states: {
        continuing: { on: { 'catalog.shutdown': 'shutdownRequested' } },
        shutdownRequested: {},
      },
      on: { 'catalog.requested': { actions: 'enqueueJoin' } },
      invoke: {
        id: 'cleanAbandonedRequests',
        src: 'interruptRequests',
        input: ({ context }) => ({
          ...context,
          syncIds: context.abandonedSyncIds,
          waitingRequestIds: [context.syncId, ...context.joinRequestIds],
        }),
        onDone: [
          {
            guard: 'cleanupShutdownRequested',
            target: 'interruptingShutdown',
            actions: 'clearAbandonedSyncs',
          },
          {
            guard: 'queuedJoins',
            target: 'syncing',
            actions: [
              'clearAbandonedSyncs',
              'startWorker',
              'takeJoinBatch',
              'startJoins',
            ],
          },
          {
            target: 'syncing',
            actions: ['clearAbandonedSyncs', 'startWorker'],
          },
        ],
        onError: [
          { guard: 'cleanupShutdownRequested', target: 'interruptionFailed' },
          {
            target: 'idle',
            actions: ['rejectWaitingSqlObservers', 'abandonWaitingRequests'],
          },
        ],
      },
    },
    syncing: {
      on: {
        'catalog.requested': [
          {
            guard: 'noJoinRunning',
            actions: ['enqueueJoin', 'takeJoinBatch', 'startJoins'],
          },
          { actions: 'enqueueJoin' },
        ],
        'catalog.shutdown': {
          target: 'stoppingWorker',
          actions: 'cancelWorkerFetch',
        },
        'xstate.done.actor.catalogWorker': {
          target: 'finishing',
          actions: finishWorker,
        },
      },
    },
    finishing: {
      always: { guard: 'joinsFinished', target: 'idle' },
      on: {
        'catalog.requested': { actions: 'enqueueJoin' },
        'catalog.shutdown': 'drainingJoins',
      },
    },
    stoppingWorker: {
      on: {
        'catalog.requested': {},
        'xstate.done.actor.catalogWorker': {
          target: 'drainingJoins',
          actions: finishWorker,
        },
      },
    },
    drainingJoins: {
      always: { guard: 'joinsFinished', target: 'interruptingShutdown' },
      on: { 'catalog.requested': {}, 'catalog.shutdown': {} },
    },
    interruptingShutdown: {
      invoke: {
        id: 'interruptPendingRequests',
        src: 'interruptRequests',
        input: ({ context }) => ({
          ...context,
          syncIds: null,
          waitingRequestIds: [],
          finalShutdownAttempt: true,
        }),
        onDone: 'stopped',
        onError: 'interruptionFailed',
      },
      on: { 'catalog.requested': {}, 'catalog.shutdown': {} },
    },
    interruptionFailed: { type: 'final' },
    stopped: { type: 'final' },
  },
});
