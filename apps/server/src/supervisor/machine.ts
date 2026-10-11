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

type PortParameters = { port: number };

export interface SupervisorInput {
  home: string;
  now: () => number;
  version: string;
  startedAt: string;
  watch: boolean;
}

interface SupervisorContext extends SupervisorInput {
  port: number | null;
  // Times of recent Engine crashes, in Unix milliseconds, oldest first.
  crashTimes: number[];
}

type SupervisorEvent = EngineEvent | { type: 'server.stop' };

const crashWindowMs = 600_000;
const maxCrashesInWindow = 10;
const backoffBaseMs = 500;
const backoffCapMs = 30_000;

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
    heartbeatTimeout: 5000,
    readyTimeout: 15_000,
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
      after: { heartbeatTimeout: { target: 'backingOff' } },
      on: {
        'engine.heartbeat': { target: 'running', reenter: true },
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
    stopping: {
      type: 'final',
      entry: [stopChild('engine'), { type: 'removeServerAddress' }],
    },
  },
});
