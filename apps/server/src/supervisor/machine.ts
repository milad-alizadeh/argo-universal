import { assign, setup, spawnChild, stopChild } from 'xstate';
import { removeServerAddress, writeServerAddress } from './server-address-file';
import type { WorkerEvent } from './worker-message';
import { workerProcess } from './worker-process';

export interface SupervisorInput {
  home: string;
  version: string;
  startedAt: string;
  watch: boolean;
}

interface SupervisorContext extends SupervisorInput {
  port: number | null;
  // Times of recent worker crashes, in Unix milliseconds, oldest first.
  crashTimes: number[];
}

type SupervisorEvent = WorkerEvent | { type: 'server.stop' };

const crashWindowMs = 10 * 60_000;
const maxCrashesInWindow = 10;
const backoffBaseMs = 500;
const backoffCapMs = 30_000;

export const supervisorMachine = setup({
  types: {
    input: {} as SupervisorInput,
    context: {} as SupervisorContext,
    events: {} as SupervisorEvent,
  },
  actors: { worker: workerProcess },
  actions: {
    setPort: assign({ port: (_, params: { port: number }) => params.port }),
    recordCrash: assign({
      crashTimes: ({ context }) => {
        const now = Date.now();
        return [
          ...context.crashTimes.filter((time) => now - time < crashWindowMs),
          now,
        ];
      },
    }),
    writeServerAddress: ({ context }) => {
      if (context.port === null) return;
      writeServerAddress(context.home, {
        pid: process.pid,
        port: context.port,
        version: context.version,
        startedAt: context.startedAt,
      });
    },
    removeServerAddress: ({ context }) => removeServerAddress(context.home),
  },
  guards: {
    crashedTooOften: ({ context }) =>
      context.crashTimes.length >= maxCrashesInWindow,
  },
  delays: {
    backoff: ({ context }) =>
      Math.min(
        backoffBaseMs * 2 ** (context.crashTimes.length - 1),
        backoffCapMs,
      ),
    heartbeatTimeout: 5000,
    readyTimeout: 15_000,
  },
}).createMachine({
  id: 'supervisor',
  context: ({ input }) => ({ ...input, port: null, crashTimes: [] }),
  initial: 'starting',
  on: {
    'server.stop': { target: '.stopping' },
  },
  states: {
    starting: {
      entry: spawnChild('worker', {
        id: 'worker',
        input: ({ context }) => ({ watch: context.watch }),
      }),
      after: { readyTimeout: { target: 'backingOff' } },
      on: {
        'worker.ready': {
          target: 'running',
          actions: [
            { type: 'setPort', params: ({ event }) => ({ port: event.port }) },
            { type: 'writeServerAddress' },
          ],
        },
        'worker.exit': { target: 'backingOff' },
      },
    },
    running: {
      after: { heartbeatTimeout: { target: 'backingOff' } },
      on: {
        'worker.heartbeat': { target: 'running', reenter: true },
        // In watch mode the worker restarts itself after a file change and is ready again.
        'worker.ready': {
          target: 'running',
          reenter: true,
          actions: [
            { type: 'setPort', params: ({ event }) => ({ port: event.port }) },
            { type: 'writeServerAddress' },
          ],
        },
        'worker.exit': { target: 'backingOff' },
      },
    },
    backingOff: {
      entry: [stopChild('worker'), { type: 'recordCrash' }],
      always: { guard: 'crashedTooOften', target: 'failed' },
      after: { backoff: { target: 'starting' } },
    },
    failed: {
      type: 'final',
      entry: [{ type: 'removeServerAddress' }],
    },
    stopping: {
      type: 'final',
      entry: [stopChild('worker'), { type: 'removeServerAddress' }],
    },
  },
});
