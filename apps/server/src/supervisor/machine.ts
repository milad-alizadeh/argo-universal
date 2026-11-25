import {
  removeServerAddress,
  writeServerAddress,
} from '@repo/engine/server-runtime';
import {
  assign,
  sendTo,
  setup,
  spawnChild,
  stopChild,
  type InputFrom,
} from 'xstate';
import type { EngineEvent } from './engine-message';
import { engineProcess } from './engine-process';
import type { startLoadRecorder } from './load-recorder';

type PortParameters = { port: number };

export interface SupervisorInput {
  home: string;
  loadRecorder?: ReturnType<typeof startLoadRecorder>;
  now: () => number;
  version: string;
  startedAt: string;
  watch: boolean;
  engineEntry?: string;
}

interface SupervisorContext extends SupervisorInput {
  port: number | null;
  // Times of recent Engine crashes, in Unix milliseconds, oldest first.
  crashTimes: number[];
}

type SupervisorEvent = EngineEvent | { type: 'server.stop' };

export const crashWindowMs = 600_000;

export const maxCrashesInWindow = 10;

export const backoffBaseMs = 500;

const backoffCapMs = 30_000;

// A busy Mac can hold the Engine's event loop for seconds, and an Engine stopping for a watch restart sends nothing until it has stopped; neither is a hang.
export const heartbeatTimeoutMs = 30_000;

// Startup repairs the database before serving, and a crowded Mac can stretch that past a minute; a restart only starts it over.
export const readyTimeoutMs = 120_000;

// Remembers the port an Engine reports and publishes it in server.json.
const rememberEngine = [
  {
    type: 'setPort',
    params: ({ event }: { event: { port: number } }): PortParameters => ({
      port: event.port,
    }),
  },
  { type: 'writeServerAddress' },
] as const;

export const supervisorMachine = setup({
  // SAFETY: XState v5 reads these empty objects only for their types and never at runtime (ADR-0016).
  types: {
    input: {} as SupervisorInput,
    context: {} as SupervisorContext,
    events: {} as SupervisorEvent,
  },
  actors: { engine: engineProcess },
  actions: {
    setPort: assign({
      port: (_, params: PortParameters): number => params.port,
    }),
    recordCrash: assign({
      crashTimes: ({ context }): SupervisorContext['crashTimes'] => {
        const now = context.now();

        return [
          ...context.crashTimes.filter(
            (time): boolean => now - time < crashWindowMs,
          ),
          now,
        ];
      },
    }),
    writeServerAddress: ({ context }): void => {
      if (context.port === null) return;
      writeServerAddress(context.home, {
        pid: process.pid,
        port: context.port,
        version: context.version,
        startedAt: context.startedAt,
      });
    },
    askEngineToStop: sendTo('engine', { type: 'engine.stop' }),
    // A failed second Supervisor leaves the running Server's file.
    removeServerAddress: ({ context }): void => {
      removeServerAddress(context.home, process.pid);
    },
  },
  guards: {
    crashedTooOften: ({ context }): boolean =>
      context.crashTimes.length >= maxCrashesInWindow,
  },
  delays: {
    backoff: ({ context }): number =>
      Math.min(
        backoffBaseMs * 2 ** (context.crashTimes.length - 1),
        backoffCapMs,
      ),
    heartbeatTimeout: heartbeatTimeoutMs,
    readyTimeout: readyTimeoutMs,
  },
}).createMachine({
  id: 'supervisor',
  context: ({ input }): SupervisorContext => ({
    ...input,
    port: null,
    crashTimes: [],
  }),
  initial: 'starting',
  on: {
    'server.stop': { target: '.stopping' },
  },
  states: {
    starting: {
      entry: spawnChild('engine', {
        id: 'engine',
        input: ({ context }): InputFrom<typeof engineProcess> => ({
          watch: context.watch,
          entry: context.engineEntry,
          missedPong: (): void =>
            context.loadRecorder?.record('missed-voice-pong'),
        }),
      }),
      after: { readyTimeout: { target: 'backingOff' } },
      on: {
        'engine.ready': {
          target: 'running',
          actions: rememberEngine,
        },
        'engine.exit': { target: 'backingOff' },
      },
    },
    running: {
      after: {
        heartbeatTimeout: {
          target: 'backingOff',
          actions: ({ context }): void =>
            context.loadRecorder?.record('missed-heartbeat'),
        },
      },
      on: {
        'engine.heartbeat': {
          target: 'running',
          reenter: true,
          actions: ({ context, event }): void => {
            if (event.load) context.loadRecorder?.engine(event.load);
          },
        },
        // In watch mode the Engine restarts itself after a file change and is ready again.
        'engine.ready': {
          target: 'running',
          reenter: true,
          actions: rememberEngine,
        },
        'engine.exit': { target: 'backingOff' },
      },
    },
    // A blocked Engine holds the port until it exits, so the next one starts after both the exit and the delay.
    backingOff: {
      type: 'parallel',
      entry: [{ type: 'askEngineToStop' }, { type: 'recordCrash' }],
      always: { guard: 'crashedTooOften', target: 'failed' },
      states: {
        engine: {
          initial: 'stopping',
          states: {
            stopping: {
              on: {
                'engine.exited': {
                  target: 'exited',
                  actions: stopChild('engine'),
                },
                // A descendant may still run in the Checkout, so no new Engine starts.
                'engine.unresolved': { target: '#supervisor.blocked' },
              },
            },
            exited: { type: 'final' },
          },
        },
        delay: {
          initial: 'waiting',
          states: {
            waiting: { after: { backoff: { target: 'elapsed' } } },
            elapsed: { type: 'final' },
          },
        },
      },
      onDone: { target: 'starting' },
    },
    failed: {
      type: 'final',
      entry: [{ type: 'removeServerAddress' }],
    },
    blocked: {
      type: 'final',
      entry: [stopChild('engine'), { type: 'removeServerAddress' }],
    },
    stopping: {
      type: 'final',
      entry: [stopChild('engine'), { type: 'removeServerAddress' }],
    },
  },
});
