import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import { assign, fromPromise, sendTo, setup } from 'xstate';
import {
  agentCatalogId,
  catalogMachine,
  type CatalogInput,
  type RegistryPort,
} from '../services/agents';
import { blobsFolderIn, removeUnusedBlobs } from '../services/blob';
import { writerMachine, databaseWriterId } from '../services/feed';
import { seedProject } from '../services/projects';
import {
  type RegistryInput,
  registryMachine,
  sessionRegistryId,
  findSessionRegistry,
} from '../services/sessions';
import {
  type HttpServer,
  type HttpServerOptions,
  startHttpServer,
} from './http-server';
import type { EngineMessage } from './ipc';
import { type EngineStop, processSignals } from './process-signals';
import { recoverAfterRestart } from './recovery';

const finishingEngineTarget = '#engine.finishing';

type EngineLogParameters = { line: string };
type EngineOutput = { exitCode: number };
type OpenDatabaseInput = { home: string };
type RecoveryInput = { database: Database; blobsFolder: string };
type CloseHttpServerInput = { server: HttpServer | null };

function writeEngineLog(home: string, line: string): void {
  const stamped = `${new Date().toISOString()} engine ${process.pid}: ${line}`;
  console.log(stamped);
  mkdirSync(join(home, 'logs'), { recursive: true });
  appendFileSync(join(home, 'logs', 'engine.log'), `${stamped}\n`);
}

// `openingDatabase` sets the database before `recovering` and `live` run.
function openDatabaseOf(context: { database: Database | null }): Database {
  if (!context.database) throw new Error('The database is not open');
  return context.database;
}

export interface EngineInput extends Pick<
  RegistryInput,
  'adapters' | 'now' | 'createId'
> {
  home: string;
  port: number;
  version: string;
  startedAt: string;
  registry?: RegistryPort;
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
    output: {} as EngineOutput,
  },
  actors: {
    // `openDatabase` also runs the Drizzle migrations.
    openDatabase: fromPromise<Database, OpenDatabaseInput>(
      async ({ input }): Promise<Database> => {
        const database = openDatabase(join(input.home, 'argo.db'));
        try {
          await seedProject(database);
          return database;
        } catch (error) {
          database.$client.close();
          throw error;
        }
      },
    ),
    recoverAfterRestart: fromPromise<void, RecoveryInput>(
      async ({ input }): Promise<void> => {
        recoverAfterRestart(input.database);
        await removeUnusedBlobs(input);
      },
    ),
    databaseWriter: writerMachine,
    catalog: catalogMachine,
    sessions: registryMachine,
    startHttpServer: fromPromise<HttpServer, HttpServerOptions>(
      async ({ input, signal }): Promise<HttpServer> => {
        const server = await startHttpServer(input);
        if (signal.aborted) await server.close();
        return server;
      },
    ),
    closeHttpServer: fromPromise<void, CloseHttpServerInput>(
      async ({ input }): Promise<void> => input.server?.close(),
    ),
    processSignals,
  },
  actions: {
    stopSessions: sendTo('sessions', { type: 'sessions.stopAll' }),
    drainWriter: sendTo('databaseWriter', { type: 'writer.drain' }),
    sendToSupervisor: (_, message: EngineMessage): void => {
      process.send?.(message);
    },
    log: ({ context }, params: EngineLogParameters): void => {
      writeEngineLog(context.home, params.line);
    },
    closeDatabase: ({ context }): void => {
      context.database?.$client.close();
    },
  },
  guards: { hasFailure: ({ context }): boolean => context.failure !== null },
  delays: {
    heartbeatInterval: 1000,
    httpCloseLimit: 5000,
    sessionStopLimit: 10000,
    writerDrainLimit: 5000,
  },
}).createMachine({
  id: 'engine',
  context: ({ input }): EngineContext => ({
    ...input,
    database: null,
    server: null,
    failure: null,
  }),
  invoke: { id: 'processSignals', src: 'processSignals' },
  initial: 'openingDatabase',
  // `live` and `live.stopping` override this.
  on: {
    'engine.stop': {
      target: '.stopped',
      actions: {
        type: 'log',
        params: ({ event }): EngineLogParameters => ({
          line: `stopping: ${event.reason}`,
        }),
      },
    },
  },
  states: {
    openingDatabase: {
      invoke: {
        id: 'openDatabase',
        src: 'openDatabase',
        input: ({ context }): OpenDatabaseInput => ({ home: context.home }),
        onDone: {
          target: 'recovering',
          actions: assign({ database: ({ event }): Database => event.output }),
        },
        onError: {
          target: 'failed',
          actions: assign({
            failure: ({ event }): string =>
              `could not open the database: ${String(event.error)}`,
          }),
        },
      },
    },
    recovering: {
      invoke: {
        id: 'recoverAfterRestart',
        src: 'recoverAfterRestart',
        input: ({ context }): RecoveryInput => {
          return {
            database: openDatabaseOf(context),
            blobsFolder: blobsFolderIn(context.home),
          };
        },
        onDone: { target: 'live' },
        onError: {
          target: 'failed',
          actions: assign({
            failure: ({ event }): string =>
              `could not recover after restart: ${String(event.error)}`,
          }),
        },
      },
    },
    live: {
      invoke: [
        {
          id: 'catalog',
          systemId: agentCatalogId,
          src: 'catalog',
          input: ({ context }): CatalogInput => ({
            runtimeDirectory: context.home,
            registry: context.registry,
          }),
        },
        {
          id: 'databaseWriter',
          systemId: databaseWriterId,
          src: 'databaseWriter',
          input: ({
            context,
          }): import('xstate').InputFrom<typeof writerMachine> => ({
            database: openDatabaseOf(context),
            now: context.now,
            log: (line: string): void => writeEngineLog(context.home, line),
          }),
        },
        {
          id: 'sessions',
          systemId: sessionRegistryId,
          src: 'sessions',
          input: ({ context }): RegistryInput => ({
            database: openDatabaseOf(context),
            runtimeDirectory: context.home,
            adapters: context.adapters,
            now: context.now,
            createId: context.createId,
          }),
        },
      ],
      initial: 'listening',
      on: {
        'engine.stop': {
          target: '.stopping',
          actions: {
            type: 'log',
            params: ({ event }): EngineLogParameters => ({
              line: `stopping: ${event.reason}`,
            }),
          },
        },
      },
      states: {
        listening: {
          invoke: {
            id: 'startHttpServer',
            src: 'startHttpServer',
            input: ({ context, self }): HttpServerOptions => ({
              createId: context.createId,
              sessions: requireSessionRegistry(self.system),
              home: context.home,
              port: context.port,
              version: context.version,
              startedAt: context.startedAt,
              database: openDatabaseOf(context),
            }),
            onDone: {
              target: 'running',
              actions: [
                assign({ server: ({ event }): HttpServer => event.output }),
                {
                  type: 'log',
                  params: ({ context }): EngineLogParameters => ({
                    line: `listening on 127.0.0.1:${context.port}`,
                  }),
                },
                {
                  type: 'sendToSupervisor',
                  params: ({
                    context,
                  }): Extract<EngineMessage, { type: 'ready' }> => ({
                    type: 'ready',
                    port: context.port,
                  }),
                },
              ],
            },
            onError: {
              target: '#engine.failed',
              actions: assign({
                failure: ({ event }): string =>
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
                input: ({ context }): CloseHttpServerInput => ({
                  server: context.server,
                }),
                onDone: { target: 'stoppingSessions' },
                onError: {
                  target: 'stoppingSessions',
                  actions: assign({
                    failure: ({ event }): string =>
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
                    params: ({ event }): EngineLogParameters => ({
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
                  target: finishingEngineTarget,
                },
                'xstate.error.actor.databaseWriter': {
                  target: finishingEngineTarget,
                  actions: {
                    type: 'log',
                    params: ({ event }): EngineLogParameters => ({
                      line: `could not drain the writer: ${String(event.error)}`,
                    }),
                  },
                },
              },
              after: {
                writerDrainLimit: {
                  target: finishingEngineTarget,
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
          params: ({ context }): EngineLogParameters => ({
            line: context.failure ?? 'failed',
          }),
        },
      ],
    },
  },
  output: ({ context }): EngineOutput => ({
    exitCode: context.failure === null ? 0 : 1,
  }),
});

function requireSessionRegistry(
  system: import('xstate').AnyActorRef['system'],
): import('../services/sessions').RegistryActorRef {
  const actor = findSessionRegistry(system);
  if (!actor) throw new Error('The Session registry is not running');
  return actor;
}
