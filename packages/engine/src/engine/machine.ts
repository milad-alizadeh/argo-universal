import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import {
  assign,
  fromPromise,
  sendTo,
  setup,
  waitFor,
  type ActorRefFrom,
  type InputFrom,
  type AnyActorRef,
} from 'xstate';
import {
  createAcpResources,
  type AcpResources,
  type AcpResourceInput,
  type FetchAgents,
  syncSupervisorMachine,
  type SyncSupervisorInput,
} from '../services/agents';
import { blobsFolderIn, removeUnusedBlobs } from '../services/blob';
import {
  feedRowBudget,
  writerMachine,
  databaseWriterId,
} from '../services/feed';
import { seedProject } from '../services/projects';
import {
  type RegistryInput,
  registryMachine,
  sessionRegistryId,
  findSessionRegistry,
  type RegistryActorRef,
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
type SyncSupervisorActor = ActorRefFrom<typeof syncSupervisorMachine>;
type CloseAcpResourcesInput = {
  resources: AcpResources;
  sessions: RegistryActorRef | undefined;
};
const closingAgentsTarget = 'closingAgents';

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
  'adapters' | 'now' | 'createId' | 'resolveAgentLaunch'
> {
  home: string;
  port: number;
  version: string;
  startedAt: string;
  acp?: AcpResourceInput;
  fetchAgents?: FetchAgents;
}

interface EngineContext extends EngineInput {
  database: Database | null;
  server: HttpServer | null;
  failure: string | null;
  acpResources: AcpResources;
  commandAdmission: AbortController;
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
    closeAcpResources: fromPromise<void, CloseAcpResourcesInput>(
      async ({ input }): Promise<void> => {
        await input.resources.shutdown();
        if (!input.sessions) return;
        await waitFor(
          input.sessions,
          (snapshot) => snapshot.status !== 'active',
          { timeout: Infinity },
        );
      },
    ),
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
    syncSupervisor: syncSupervisorMachine,
    databaseWriter: writerMachine,
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
    stopSync: sendTo('syncSupervisor', { type: 'sync.stop' }),
    closeCommandAdmission: ({ context }): void =>
      context.commandAdmission.abort(),
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
    acpResources: createAcpResources(input.acp),
    commandAdmission: new AbortController(),
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
          id: 'databaseWriter',
          systemId: databaseWriterId,
          src: 'databaseWriter',
          input: ({ context }): InputFrom<typeof writerMachine> => ({
            database: openDatabaseOf(context),
            now: context.now,
            log: (line: string): void => writeEngineLog(context.home, line),
            blobsFolder: blobsFolderIn(context.home),
            feedRowBudget,
          }),
        },
        {
          id: 'syncSupervisor',
          systemId: 'syncSupervisor',
          src: 'syncSupervisor',
          input: ({ context, self }): SyncSupervisorInput => ({
            database: openDatabaseOf(context),
            writer: requireDatabaseWriter(self.system),
            fetchAgents: context.fetchAgents,
            now: context.now,
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
            acpResources: context.acpResources,
            resolveAgentLaunch: context.resolveAgentLaunch,
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
              databaseWriter: requireDatabaseWriter(self.system),
              syncSupervisor: requireSyncSupervisor(self.system),
              commandAdmission: context.commandAdmission,
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
          entry: ['closeCommandAdmission', 'stopSync'],
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
                'xstate.done.actor.sessions': { target: closingAgentsTarget },
                'xstate.error.actor.sessions': {
                  target: closingAgentsTarget,
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
                  target: closingAgentsTarget,
                  actions: {
                    type: 'log',
                    params: {
                      line: 'Session stop limit reached; closing Agent resources',
                    },
                  },
                },
              },
            },
            closingAgents: {
              invoke: {
                id: 'closeAcpResources',
                src: 'closeAcpResources',
                input: ({ context, self }): CloseAcpResourcesInput => ({
                  resources: context.acpResources,
                  sessions: findSessionRegistry(self.system),
                }),
                onDone: { target: 'drainingWriter' },
                onError: {
                  target: 'retainingAgentCleanup',
                  actions: assign({
                    failure: ({ event }): string =>
                      `Agent cleanup remains unresolved: ${String(event.error)}`,
                  }),
                },
              },
            },
            retainingAgentCleanup: {
              entry: {
                type: 'log',
                params: ({ context }): EngineLogParameters => ({
                  line: context.failure ?? 'Agent cleanup remains unresolved',
                }),
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
  system: AnyActorRef['system'],
): RegistryActorRef {
  const actor = findSessionRegistry(system);
  if (!actor) throw new Error('The Session registry is not running');
  return actor;
}

function requireDatabaseWriter(
  system: AnyActorRef['system'],
): ActorRefFrom<typeof writerMachine> {
  const actor = system.get(databaseWriterId);
  if (!actor) throw new Error('Database Writer is not running');
  return actor;
}
function requireSyncSupervisor(
  system: AnyActorRef['system'],
): SyncSupervisorActor {
  const actor = system.get('syncSupervisor');
  if (!actor) throw new Error('Sync supervisor is not running');
  return actor;
}
