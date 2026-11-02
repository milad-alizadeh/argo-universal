import type { Database } from '@repo/db';
import { writeLog } from '@repo/machine-log';
import { fromPromise, sendTo, setup, type AnyActorRef } from 'xstate';
import { type AcpResources, type AcpResourceInput } from '../agents';
import {
  type FetchAgents,
  type InstallPorts,
  registryMachine,
} from '../agents';
import { findMachineActor } from '../lib/machine-actor';
import type { NotificationOptions } from '../notifications';
import type { OperationWaitClock, SessionTokens } from '../operations';
import {
  HookPort,
  type Keychain,
  type PluginNetwork,
  type OAuthOptions,
  type PluginClock,
} from '../plugins';
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
import type { Caffeinate } from './caffeinate';
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
import { caffeinateActor } from './keep-awake';
import { type EngineStop, processSignals } from './process-signals';
import { sessionAccessServices } from './session-access';

export type EngineLogParameters = { line: string };

export type EngineOutput = { exitCode: number };

export type CloseHttpServerInput = { server: HttpServer | null };

// `openingDatabase` sets the database before `recovering` and `live` run.
export function openDatabaseOf(context: {
  database: Database | null;
}): Database {
  if (!context.database) throw new Error('The database is not open');

  return context.database;
}

export interface EngineInput extends Pick<
  OpenSessionsInput,
  'now' | 'createId'
> {
  home: string;
  cliEntry: string;
  userHome?: string;
  port: number;
  version: string;
  firstPartyPluginsDirectory?: string;
  keychain?: Keychain;
  // Tests trust a fixture certificate authority and resolver for Plugin fetches.
  pluginNetwork?: PluginNetwork;
  pluginOAuth?: OAuthOptions;
  pluginClock?: PluginClock;
  operationWaitClock?: OperationWaitClock;
  // How long New Session discovery waits for an Agent's Slash commands; the default suits real Agents.
  slashCommandsWaitMs?: number;
  startedAt: string;
  acp?: AcpResourceInput;
  fetchAgents?: FetchAgents;
  installationPorts?: InstallPorts;
  caffeinate?: Caffeinate;
  notificationOptions?: NotificationOptions;
  // What an App lists this Server by; the computer's name unless a test says otherwise.
  discoveryName?: string;
}

export interface EngineContext extends EngineInput {
  database: Database | null;
  server: HttpServer | null;
  failure: string | null;
  acpResources: AcpResources;
  sessionTokens: SessionTokens;
  commandAdmission: AbortController;
  // Sessions reach Plugin Hooks through this before the Plugin runtime starts with the HTTP server.
  hookPort: HookPort;
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

export const httpCloseLimit = 5000;

export const sessionStopLimit = 10000;

export const writerDrainLimit = 5000;

export const engineSetup = setup({
  // SAFETY: XState v5 reads these as type-only declarations; the empty objects are never used as runtime values.
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
    registry: registryMachine,
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
    caffeinate: caffeinateActor,
  },
  actions: {
    stopSessions: sendTo('sessions', { type: 'sessions.stopAll' }),
    drainWriter: sendTo('databaseWriter', { type: 'writer.drain' }),
    stopRegistry: sendTo('registry', { type: 'STOP' }),
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
    httpCloseLimit,
    sessionStopLimit,
    writerDrainLimit,
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

export const stoppingLog = ({
  event,
}: {
  event: EngineStop;
}): EngineLogParameters => ({ line: `stopping: ${event.reason}` });

export const createEngineContext = (
  input: EngineInput,
  database: () => Database,
): EngineContext => ({
  ...input,
  ...sessionAccessServices(input, database),
  database: null,
  server: null,
  failure: null,
  commandAdmission: new AbortController(),
  hookPort: new HookPort(),
});
