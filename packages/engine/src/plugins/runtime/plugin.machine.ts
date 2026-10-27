import { assign, enqueueActions, fromCallback, setup } from 'xstate';
import type { ActivatedPlugin } from '../access/plugin-access';
import {
  notStarted,
  runtimeError,
  type PluginEntry,
  type PluginStatus,
} from '../protocol/runtime';
import {
  received,
  settles,
  type BuildEvent,
  type Loaded,
  type PluginContext,
  type PluginEvent,
  type RuntimePluginInput,
} from './plugin-events';

type WorkerStart = Pick<PluginContext, 'host'> & { entry: PluginEntry };

// The host refuses a load while it is closed, out of restarts or between processes.
const startWorker = fromCallback<PluginEvent, WorkerStart>(
  ({ input, sendBack }) => {
    try {
      input.host.activate(input.entry);
    } catch (error) {
      sendBack({ type: 'worker.failed', error: runtimeError(error) });
    }
  },
);

const answered = ['receive', 'announce'] as const;

const keepGrant = {
  type: 'keepGrant',
  params: ({ event }: { event: { granted: ActivatedPlugin } }) => event.granted,
} as const;

// A dev build that lands while a Turn runs waits for Turns to end.
const deferBuild = {
  guard: 'deferring',
  actions: [
    {
      type: 'defer',
      params: ({ event }: { event: BuildEvent }): BuildEvent => event,
    },
    'logDeferred',
  ],
} as const;

// Answers each activation with the crash until a background pass lets the next one retry.
const settled = {
  on: {
    'plugin.activate': { actions: [keepGrant, 'answer'] },
    'plugin.restart': { target: 'retrying' },
  },
} as const;

/*
 * One Plugin's lifecycle from its first activation: the dev build it runs from, the worker loaded
 * from each build, and what activation answers.
 */
export const runtimePluginMachine = setup({
  // SAFETY: XState reads these declarations only as types, never runtime input.
  types: {
    input: {} as RuntimePluginInput,
    context: {} as PluginContext,
    events: {} as PluginEvent,
  },
  actors: { startWorker },
  actions: {
    keepGrant: assign((_, granted: ActivatedPlugin) => ({ granted })),
    receive: assign({
      status: ({ context, event }) =>
        settles(event) ? received(event, context) : context.status,
    }),
    announce: ({ context: { status, ...input } }): void => {
      input.changed(status);
      input.answer(status);

      if (status.error)
        input.log(`Plugin ${input.entry.pluginId}: ${status.error}`);
    },
    answer: ({ context }): void => context.answer(context.status),
    // A new build is not answered for until its worker reports.
    resetStatus: assign({ status: notStarted }),
    reportStatus: ({ context }): void => context.changed(context.status),
    nextGeneration: assign({
      generation: ({ context }) => context.generation + 1,
    }),
    grant: ({ context }): void =>
      context.grant(context.granted, context.generation),
    release: ({ context }): void => context.release(),
    stopHost: ({ context }): void => context.host.stop(context.entry.pluginId),
    stopWorker: ({ context }): void => {
      context.host.stop(context.entry.pluginId);
      context.release();
    },
    keepSource: assign((_, { source, version }: Loaded) => ({
      source: { text: source, version },
      buildError: null,
    })),
    keepBuildError: assign((_, buildError: string) => ({ buildError })),
    defer: assign((_, deferred: BuildEvent) => ({ deferred })),
    logDeferred: ({ context }): void =>
      context.log(
        `Plugin ${context.entry.pluginId}: dev build deferred until Turn ends`,
      ),
    // A build applying now supersedes anything deferred earlier.
    clearDeferred: assign({ deferred: null }),
    replayDeferred: enqueueActions(({ context, enqueue }) => {
      if (!context.deferred) return;
      enqueue.raise(context.deferred);
      enqueue.assign({ deferred: null });
    }),
  },
  guards: {
    deferring: ({ context }): boolean =>
      context.generation !== 0 && context.deferReload(),
    unchanged: ({ context }, version: string): boolean =>
      version === context.source.version && context.buildError === null,
    stale: ({ context }, generation: number): boolean =>
      generation !== context.generation,
    running: (_, status: PluginStatus): boolean => status.state === 'running',
  },
}).createMachine({
  id: 'runtimePlugin',
  context: ({ input }) => ({
    ...input,
    // Nothing is granted until the first activation names the manifest's Capabilities.
    granted: { grants: [], codeFolder: input.entry.directory },
    generation: 0,
    source: { text: '', version: '' },
    buildError: null,
    deferred: null,
    status: notStarted,
  }),
  initial: 'building',
  on: {
    'plugin.activate': { actions: keepGrant },
    'build.loaded': [
      deferBuild,
      {
        guard: {
          type: 'unchanged',
          params: ({ event }): string => event.version,
        },
        actions: 'clearDeferred',
      },
      {
        target: '.loading',
        actions: [
          'clearDeferred',
          { type: 'keepSource', params: ({ event }): Loaded => event },
          'stopWorker',
          'resetStatus',
          'reportStatus',
        ],
      },
    ],
    'build.failed': [
      deferBuild,
      {
        target: '.failed',
        actions: [
          'clearDeferred',
          {
            type: 'keepBuildError',
            params: ({ event }): string => event.error,
          },
          'nextGeneration',
          'stopWorker',
          ...answered,
        ],
      },
    ],
    'turns.ended': { actions: 'replayDeferred' },
    'worker.status': [
      {
        guard: {
          type: 'stale',
          params: ({ event }): number => event.generation,
        },
      },
      {
        guard: {
          type: 'running',
          params: ({ event }): PluginStatus => event.status,
        },
        target: '.running',
        actions: answered,
      },
      { target: '.crashed', actions: ['release', ...answered] },
    ],
    'plugin.stop': {
      target: '.stopped',
      actions: ['nextGeneration', 'stopHost', ...answered, 'release'],
    },
    'plugin.close': { target: '.closed', actions: 'release' },
  },
  states: {
    // Waiting for the first build; activations wait with it, and a host crash answers them.
    building: {
      initial: 'waiting',
      states: {
        waiting: {
          on: {
            'host.crashed': {
              target: 'crashed',
              actions: ['release', ...answered],
            },
          },
        },
        crashed: {
          on: { 'plugin.activate': { target: 'waiting', actions: keepGrant } },
        },
      },
    },
    loading: {
      entry: ['nextGeneration', 'grant'],
      invoke: {
        src: 'startWorker',
        input: ({ context }) => ({
          host: context.host,
          entry: {
            ...context.entry,
            clockStart: context.clockStart(),
            source: context.source.text,
            generation: context.generation,
          },
        }),
      },
      on: {
        'worker.failed': {
          target: 'crashed',
          actions: ['nextGeneration', 'stopWorker', ...answered],
        },
        'host.crashed': {
          target: 'crashed.retrying',
          actions: ['release', ...answered],
        },
      },
    },
    running: {
      on: {
        'plugin.activate': { actions: [keepGrant, 'answer'] },
        'host.crashed': {
          target: 'crashed.retrying',
          actions: ['release', ...answered],
        },
      },
    },
    // The worker crashed or could not load; a retry loads the last build again.
    crashed: {
      initial: 'settled',
      states: {
        settled,
        retrying: {
          on: {
            'plugin.activate': {
              target: '#runtimePlugin.loading',
              actions: keepGrant,
            },
          },
        },
      },
    },
    // The last build failed; a retry reports its error again until a build loads.
    failed: {
      initial: 'settled',
      states: {
        settled,
        retrying: {
          on: {
            'plugin.activate': {
              target: 'settled',
              actions: [keepGrant, 'nextGeneration', 'stopWorker', ...answered],
            },
          },
        },
      },
    },
    stopped: { type: 'final' },
    closed: { type: 'final' },
  },
});
