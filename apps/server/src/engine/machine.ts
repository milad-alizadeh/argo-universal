import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import { assign, fromPromise, setup } from 'xstate';
import type { EngineMessage } from '../supervisor/engine-message';
import { type HttpServer, startHttpServer } from './http-server';
import { type EngineStop, processSignals } from './process-signals';

export interface EngineInput {
  home: string;
  port: number;
  version: string;
  startedAt: string;
}

interface EngineContext extends EngineInput {
  database: Database | null;
  server: HttpServer | null;
  failure: string | null;
}

export const engineMachine = setup({
  types: {
    input: {} as EngineInput,
    context: {} as EngineContext,
    events: {} as EngineStop,
    output: {} as { exitCode: number },
  },
  actors: {
    // `openDatabase` also runs the Drizzle migrations.
    openDatabase: fromPromise<Database, { home: string }>(async ({ input }) =>
      openDatabase(join(input.home, 'argo.db')),
    ),
    startHttpServer: fromPromise<HttpServer, EngineInput>(({ input }) =>
      startHttpServer(input),
    ),
    closeHttpServer: fromPromise<void, { server: HttpServer | null }>(
      async ({ input }) => input.server?.close(),
    ),
    processSignals,
  },
  actions: {
    sendToSupervisor: (_, message: EngineMessage) => {
      process.send?.(message);
    },
    log: ({ context }, params: { line: string }) => {
      const stamped = `${new Date().toISOString()} engine ${process.pid}: ${params.line}`;
      console.log(stamped);
      mkdirSync(join(context.home, 'logs'), { recursive: true });
      appendFileSync(join(context.home, 'logs', 'engine.log'), `${stamped}\n`);
    },
    closeDatabase: ({ context }) => {
      context.database?.$client.close();
    },
  },
  delays: { heartbeatInterval: 1000 },
}).createMachine({
  id: 'engine',
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
        'engine.stop': {
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
        'engine.stop': {
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
              target: '#engine.failed',
              actions: assign({
                failure: ({ event }) =>
                  `could not listen: ${String(event.error)}`,
              }),
            },
          },
        },
        // The Supervisor restarts an Engine that misses its heartbeat for 5 seconds.
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
    // A second signal while closing is ignored; the Supervisor kills an Engine that takes too long.
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
