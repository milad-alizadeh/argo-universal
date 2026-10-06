import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import { assign, fromPromise, sendTo, setup } from 'xstate';
import {
  blobsFolderIn,
  removeUnusedBlobs,
} from '../services/blob/blob-service';
import { writerMachine } from '../services/feed/writer-machine';
import { seedProject } from '../services/projects/project-service';
import {
  type RegistryActorRef,
  type RegistryInput,
  registryMachine,
} from '../services/sessions/registry-machine';
import type { EngineMessage } from '../supervisor/engine-message';
import {
  type HttpServer,
  type HttpServerOptions,
  startHttpServer,
} from './http-server';
import { type EngineStop, processSignals } from './process-signals';
import { recoverAfterRestart } from './recovery';

function writeEngineLog(home: string, line: string) {
  const stamped = `${new Date().toISOString()} engine ${process.pid}: ${line}`;
  console.log(stamped);
  mkdirSync(join(home, 'logs'), { recursive: true });
  appendFileSync(join(home, 'logs', 'engine.log'), `${stamped}\n`);
}

export interface EngineInput extends Pick<RegistryInput, 'adapters'> {
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

type EngineEvent =
  | EngineStop
  | {
      type: 'xstate.done.actor.sessions' | 'xstate.done.actor.databaseWriter';
    }
  | {
      type: 'xstate.error.actor.sessions' | 'xstate.error.actor.databaseWriter';
      error: unknown;
    };

export const engineMachine = setup({
  types: {
    input: {} as EngineInput,
    context: {} as EngineContext,
    events: {} as EngineEvent,
    output: {} as { exitCode: number },
  },
  actors: {
    // `openDatabase` also runs the Drizzle migrations.
    openDatabase: fromPromise<Database, { home: string }>(async ({ input }) => {
      const database = openDatabase(join(input.home, 'argo.db'));
      try {
        await seedProject(database);
        return database;
      } catch (error) {
        database.$client.close();
        throw error;
      }
    }),
    recoverAfterRestart: fromPromise<
      void,
      { database: Database; blobsFolder: string }
    >(async ({ input }) => {
      recoverAfterRestart(input.database);
      await removeUnusedBlobs(input);
    }),
    databaseWriter: writerMachine,
    sessions: registryMachine,
    startHttpServer: fromPromise<HttpServer, HttpServerOptions>(
      async ({ input, signal }) => {
        const server = await startHttpServer(input);
        if (signal.aborted) await server.close();
        return server;
      },
    ),
    closeHttpServer: fromPromise<void, { server: HttpServer | null }>(
      async ({ input }) => input.server?.close(),
    ),
    processSignals,
  },
  actions: {
    stopSessions: sendTo('sessions', { type: 'sessions.stopAll' }),
    drainWriter: sendTo('databaseWriter', { type: 'writer.drain' }),
    sendToSupervisor: (_, message: EngineMessage) => {
      process.send?.(message);
    },
    log: ({ context }, params: { line: string }) => {
      writeEngineLog(context.home, params.line);
    },
    closeDatabase: ({ context }) => {
      context.database?.$client.close();
    },
  },
  guards: { hasFailure: ({ context }) => context.failure !== null },
  delays: {
    heartbeatInterval: 1000,
    httpCloseLimit: 5000,
    sessionStopLimit: 10000,
    writerDrainLimit: 5000,
  },
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
          target: 'recovering',
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
          target: 'stopped',
          actions: {
            type: 'log',
            params: ({ event }) => ({ line: `stopping: ${event.reason}` }),
          },
        },
      },
    },
    recovering: {
      invoke: {
        id: 'recoverAfterRestart',
        src: 'recoverAfterRestart',
        input: ({ context }) => {
          if (!context.database)
            throw new Error('Recovery requires an open database');
          return {
            database: context.database,
            blobsFolder: blobsFolderIn(context.home),
          };
        },
        onDone: { target: 'live' },
        onError: {
          target: 'failed',
          actions: assign({
            failure: ({ event }) =>
              `could not recover after restart: ${String(event.error)}`,
          }),
        },
      },
      on: {
        'engine.stop': {
          target: 'stopped',
          actions: {
            type: 'log',
            params: ({ event }) => ({ line: `stopping: ${event.reason}` }),
          },
        },
      },
    },
    live: {
      invoke: [
        {
          id: 'databaseWriter',
          systemId: 'databaseWriter',
          src: 'databaseWriter',
          input: ({ context }) => ({
            database: context.database as Database,
            log: (line: string) => writeEngineLog(context.home, line),
          }),
        },
        {
          id: 'sessions',
          systemId: 'sessions',
          src: 'sessions',
          input: ({ context }) => ({
            database: context.database as Database,
            runtimeDirectory: context.home,
            adapters: context.adapters,
          }),
        },
      ],
      initial: 'listening',
      on: {
        'engine.stop': {
          target: '.stopping',
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
            input: ({ context, self }) => ({
              sessions: self.system.get('sessions') as RegistryActorRef,
              home: context.home,
              port: context.port,
              version: context.version,
              startedAt: context.startedAt,
              // `openingDatabase` sets it before `recovering` and `live`.
              database: context.database as Database,
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
        stopping: {
          initial: 'closingHttp',
          on: { 'engine.stop': {} },
          states: {
            closingHttp: {
              invoke: {
                id: 'closeHttpServer',
                src: 'closeHttpServer',
                input: ({ context }) => ({ server: context.server }),
                onDone: { target: 'stoppingSessions' },
                onError: {
                  target: 'stoppingSessions',
                  actions: assign({
                    failure: ({ event }) =>
                      `could not close: ${String(event.error)}`,
                  }),
                },
              },
              after: {
                httpCloseLimit: {
                  target: 'stoppingSessions',
                  actions: {
                    type: 'log',
                    params: {
                      line: 'HTTP close limit reached; stopping Sessions',
                    },
                  },
                },
              },
            },
            stoppingSessions: {
              entry: 'stopSessions',
              on: {
                'xstate.done.actor.sessions': { target: 'drainingWriter' },
                'xstate.error.actor.sessions': {
                  target: 'drainingWriter',
                  actions: {
                    type: 'log',
                    params: ({ event }) => ({
                      line: `could not stop Sessions: ${String(event.error)}`,
                    }),
                  },
                },
              },
              after: {
                sessionStopLimit: {
                  target: 'drainingWriter',
                  actions: {
                    type: 'log',
                    params: {
                      line: 'Session stop limit reached; draining the writer',
                    },
                  },
                },
              },
            },
            drainingWriter: {
              entry: 'drainWriter',
              on: {
                'xstate.done.actor.databaseWriter': {
                  target: '#engine.finishing',
                },
                'xstate.error.actor.databaseWriter': {
                  target: '#engine.finishing',
                  actions: {
                    type: 'log',
                    params: ({ event }) => ({
                      line: `could not drain the writer: ${String(event.error)}`,
                    }),
                  },
                },
              },
              after: {
                writerDrainLimit: {
                  target: '#engine.finishing',
                  actions: {
                    type: 'log',
                    params: {
                      line: 'Writer drain limit reached; closing the database',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    finishing: {
      always: [
        { guard: 'hasFailure', target: 'failed' },
        { target: 'stopped' },
      ],
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
