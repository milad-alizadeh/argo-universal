import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import { assign, fromPromise, setup } from 'xstate';
import type { WorkerMessage } from '../supervisor/worker-message';
import { type HttpServer, startHttpServer } from './http-server';
import { processSignals, type WorkerStop } from './process-signals';

export interface WorkerInput {
  home: string;
  port: number;
  version: string;
  startedAt: string;
}

interface WorkerContext extends WorkerInput {
  database: Database | null;
  server: HttpServer | null;
  failure: string | null;
}

export const workerMachine = setup({
  types: {
    input: {} as WorkerInput,
    context: {} as WorkerContext,
    events: {} as WorkerStop,
    output: {} as { exitCode: number },
  },
  actors: {
    // `openDatabase` also runs the Drizzle migrations.
    openDatabase: fromPromise<Database, { home: string }>(async ({ input }) =>
      openDatabase(join(input.home, 'argo.db')),
    ),
    startHttpServer: fromPromise<HttpServer, WorkerInput>(({ input }) =>
      startHttpServer(input),
    ),
    closeHttpServer: fromPromise<void, { server: HttpServer | null }>(
      async ({ input }) => input.server?.close(),
    ),
    processSignals,
  },
  actions: {
    sendToSupervisor: (_, message: WorkerMessage) => {
      process.send?.(message);
    },
    log: ({ context }, params: { line: string }) => {
      const stamped = `${new Date().toISOString()} worker ${process.pid}: ${params.line}`;
      console.log(stamped);
      mkdirSync(join(context.home, 'logs'), { recursive: true });
      appendFileSync(join(context.home, 'logs', 'worker.log'), `${stamped}\n`);
    },
    closeDatabase: ({ context }) => {
      context.database?.$client.close();
    },
  },
  delays: { heartbeatInterval: 1000 },
}).createMachine({
  id: 'worker',
  context: ({ input }) => ({
    ...input,
    database: null,
    server: null,
    failure: null,
  }),
  invoke: { id: 'processSignals', src: 'processSignals' },
  initial: 'openingDatabase',
  states: {
    openingDatabase: {
      invoke: {
        id: 'openDatabase',
        src: 'openDatabase',
        input: ({ context }) => ({ home: context.home }),
        onDone: {
          target: 'serving',
          actions: assign({ database: ({ event }) => event.output }),
        },
        onError: {
          target: 'failed',
          actions: assign({
            failure: ({ event }) =>
              `could not open the database: ${String(event.error)}`,
          }),
        },
      },
      on: {
        'worker.stop': {
          target: 'stopping',
          actions: {
            type: 'log',
            params: ({ event }) => ({ line: `stopping: ${event.reason}` }),
          },
        },
      },
    },
    serving: {
      initial: 'listening',
      on: {
        'worker.stop': {
          target: 'stopping',
          actions: {
            type: 'log',
            params: ({ event }) => ({ line: `stopping: ${event.reason}` }),
          },
        },
      },
      states: {
        listening: {
          invoke: {
            id: 'startHttpServer',
            src: 'startHttpServer',
            input: ({ context }) => ({
              home: context.home,
              port: context.port,
              version: context.version,
              startedAt: context.startedAt,
            }),
            onDone: {
              target: 'running',
              actions: [
                assign({ server: ({ event }) => event.output }),
                {
                  type: 'log',
                  params: ({ context }) => ({
                    line: `listening on 127.0.0.1:${context.port}`,
                  }),
                },
                {
                  type: 'sendToSupervisor',
                  params: ({ context }) => ({
                    type: 'ready',
                    port: context.port,
                  }),
                },
              ],
            },
            onError: {
              target: '#worker.failed',
              actions: assign({
                failure: ({ event }) =>
                  `could not listen: ${String(event.error)}`,
              }),
            },
          },
        },
        // The supervisor restarts a worker that misses its heartbeat for 5 seconds.
        running: {
          after: {
            heartbeatInterval: {
              target: 'running',
              reenter: true,
              actions: {
                type: 'sendToSupervisor',
                params: { type: 'heartbeat' },
              },
            },
          },
        },
      },
    },
    // A second signal while closing is ignored; the supervisor kills a worker that takes too long.
    stopping: {
      invoke: {
        id: 'closeHttpServer',
        src: 'closeHttpServer',
        input: ({ context }) => ({ server: context.server }),
        onDone: { target: 'stopped' },
        onError: {
          target: 'failed',
          actions: assign({
            failure: ({ event }) => `could not close: ${String(event.error)}`,
          }),
        },
      },
    },
    stopped: { type: 'final', entry: [{ type: 'closeDatabase' }] },
    failed: {
      type: 'final',
      entry: [
        { type: 'closeDatabase' },
        {
          type: 'log',
          params: ({ context }) => ({ line: context.failure ?? 'failed' }),
        },
      ],
    },
  },
  output: ({ context }) => ({ exitCode: context.failure === null ? 0 : 1 }),
});
