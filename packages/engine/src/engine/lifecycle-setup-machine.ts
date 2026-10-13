import { join } from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import { writeLog } from '@repo/machine-log';
import {
  fromPromise,
  sendTo,
  setup,
  waitFor,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {
  releaseLoginTerminalGroups,
  type AcpResources,
  type AcpResourceInput,
} from '../acp';
import {
  type FetchAgents,
  AgentInstallations,
  type InstallPorts,
  reconcileInterruptedInstallations,
  syncSupervisorMachine,
} from '../agents';
import {
  attachmentsFolderIn,
  removeOrphanAttachments,
  removeUnusedBlobs,
} from '../blob';
import { findMachineActor } from '../lib/machine-actor';
import { seedProject } from '../projects';
import {
  type OpenSessionsInput,
  recoverAfterRestart,
  openSessionsMachine,
  openSessionsId,
  type OpenSessionsActorRef,
} from '../sessions';
import {
  databaseWriterId,
  type WriterActorRef,
  writerMachine,
} from '../storage';
import {
  type HttpServer,
  type HttpServerOptions,
  startHttpServer,
} from './http-server';
import type { EngineMessage } from './ipc';
import { type EngineStop, processSignals } from './process-signals';

export type EngineLogParameters = { line: string };
export type EngineOutput = { exitCode: number };
export type OpenDatabaseInput = { home: string };
export type RecoveryInput = {
  database: Database;
  blobsFolder: string;
  home: string;
};
export type CloseHttpServerInput = { server: HttpServer | null };
type SyncSupervisorActor = ActorRefFrom<typeof syncSupervisorMachine>;
export type CloseAcpResourcesInput = {
  resources: AcpResources;
  server?: HttpServer | null;
  installations: AgentInstallations;
  sessions: OpenSessionsActorRef | undefined;
};

// `openingDatabase` sets the database before `recovering` and `live` run.
export function openDatabaseOf(context: {
  database: Database | null;
}): Database {
  if (!context.database) throw new Error('The database is not open');
  return context.database;
}

export interface EngineInput extends Pick<
  OpenSessionsInput,
  'adapters' | 'now' | 'createId' | 'resolveAgentLaunch'
> {
  home: string;
  port: number;
  version: string;
  startedAt: string;
  acp?: AcpResourceInput;
  loginTimeoutMs?: number;
  loginCleanupTimeoutMs?: number;
  fetchAgents?: FetchAgents;
  installationPorts?: InstallPorts;
}

export interface EngineContext extends EngineInput {
  database: Database | null;
  server: HttpServer | null;
  failure: string | null;
  acpResources: AcpResources;
  installations: AgentInstallations;
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

export const engineSetup = setup({
  types: {
    input: {} as EngineInput,
    context: {} as EngineContext,
    events: {} as EngineEvent,
    output: {} as EngineOutput,
  },
  actors: {
    closeAcpResources: fromPromise<void, CloseAcpResourcesInput>(
      async ({ input }): Promise<void> => {
        await Promise.all([
          input.server?.closeSetup(),
          input.installations.shutdown(),
        ]);
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
        await reconcileInterruptedInstallations(input.home);
        await releaseLoginTerminalGroups(input.home);
        await removeUnusedBlobs(input);
        await removeOrphanAttachments({
          database: input.database,
          attachmentsFolder: attachmentsFolderIn(input.home),
        });
      },
    ),
    syncSupervisor: syncSupervisorMachine,
    databaseWriter: writerMachine,
    sessions: openSessionsMachine,
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
      writeLog({ home: context.home, label: 'engine', line: params.line });
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
});

export function requireOpenSessions(
  system: AnyActorRef['system'],
): OpenSessionsActorRef {
  const actor = findMachineActor(system, openSessionsId, openSessionsMachine);
  if (!actor) throw new Error('The open Sessions machine is not running');
  return actor;
}

export function requireDatabaseWriter(
  system: AnyActorRef['system'],
): WriterActorRef {
  const actor = system.get(databaseWriterId);
  if (!actor) throw new Error('Database Writer is not running');
  return actor;
}
export function requireSyncSupervisor(
  system: AnyActorRef['system'],
): SyncSupervisorActor {
  const actor = system.get('syncSupervisor');
  if (!actor) throw new Error('Sync supervisor is not running');
  return actor;
}
