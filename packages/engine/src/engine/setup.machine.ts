import type { Database } from '@repo/db';
import { writeLog } from '@repo/machine-log';
import {
  fromPromise,
  sendTo,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import { type AcpResources, type AcpResourceInput } from '../acp';
import {
  type FetchAgents,
  AgentInstallations,
  type InstallPorts,
  syncSupervisorMachine,
} from '../agents';
import { findMachineActor } from '../lib/machine-actor';
import {
  type OpenSessionsInput,
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
  closeAgentResources,
  type CloseAcpResourcesInput,
} from './agent-cleanup';
import { openEngineDatabase, type OpenDatabaseInput } from './engine-database';
import {
  recoverEngineAfterRestart,
  type RecoveryInput,
} from './engine-recovery';
import {
  type HttpServer,
  type HttpServerOptions,
  startHttpServer,
} from './http-server';
import type { EngineMessage } from './ipc';
import { type EngineStop, processSignals } from './process-signals';

export type EngineLogParameters = { line: string };
export type EngineOutput = { exitCode: number };
export type CloseHttpServerInput = { server: HttpServer | null };
type SyncSupervisorActor = ActorRefFrom<typeof syncSupervisorMachine>;

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
      ({ input }): Promise<void> => closeAgentResources(input),
    ),
    openDatabase: fromPromise<Database, OpenDatabaseInput>(
      ({ input }): Promise<Database> => openEngineDatabase(input),
    ),
    recoverAfterRestart: fromPromise<void, RecoveryInput>(
      ({ input }): Promise<void> => recoverEngineAfterRestart(input),
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

export const stoppingLog = ({
  event,
}: {
  event: EngineStop;
}): EngineLogParameters => ({ line: `stopping: ${event.reason}` });
