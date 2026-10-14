import { writeLog } from '@repo/machine-log';
import type { AnyActorRef, InputFrom } from 'xstate';
import type { SyncSupervisorInput } from '../agents';
import { blobsFolderIn } from '../blob';
import { findMachineActor } from '../lib/machine-actor';
import {
  openSessionsId,
  openSessionsMachine,
  type OpenSessionsInput,
} from '../sessions';
import type { writerMachine } from '../storage';
import type { CloseAcpResourcesInput } from './agent-cleanup';
import type { RecoveryInput } from './engine-recovery';
import type { HttpServerOptions } from './http-server';
import {
  openDatabaseOf,
  requireDatabaseWriter,
  requireOpenSessions,
  requireSyncSupervisor,
  type EngineContext,
} from './setup.machine';

export const recoveryInput = ({
  context,
}: {
  context: Pick<EngineContext, 'database' | 'home'>;
}): RecoveryInput => {
  return {
    database: openDatabaseOf(context),
    home: context.home,
    blobsFolder: blobsFolderIn(context.home),
  };
};

export const writerInput = ({
  context,
}: {
  context: Pick<EngineContext, 'database' | 'now' | 'home'>;
}): InputFrom<typeof writerMachine> => ({
  database: openDatabaseOf(context),
  now: context.now,
  log: (line: string): void =>
    writeLog({ home: context.home, label: 'engine', line }),
  blobsFolder: blobsFolderIn(context.home),
});

type SyncSource = Pick<
  EngineContext,
  'database' | 'fetchAgents' | 'fetchNpmPackage' | 'now'
>;
export const syncInput = ({
  context,
  self,
}: {
  context: SyncSource;
  self: Pick<AnyActorRef, 'system'>;
}): SyncSupervisorInput => ({
  database: openDatabaseOf(context),
  writer: requireDatabaseWriter(self.system),
  fetchAgents: context.fetchAgents,
  fetchNpmPackage: context.fetchNpmPackage,
  now: context.now,
});

type SessionsSource = {
  context: Pick<
    EngineContext,
    'database' | 'home' | 'now' | 'createId' | 'acpResources' | 'installations'
  >;
};

export const sessionsInput = ({
  context,
}: SessionsSource): OpenSessionsInput => ({
  database: openDatabaseOf(context),
  runtimeDirectory: context.home,
  now: context.now,
  createId: context.createId,
  acpResources: context.acpResources,
  isAgentSetupBusy: (agentId) => context.installations.isBusy(agentId),
});

type ServerSource = {
  context: Pick<
    EngineContext,
    | 'createId'
    | 'now'
    | 'installations'
    | 'commandAdmission'
    | 'acp'
    | 'loginTimeoutMs'
    | 'loginCleanupTimeoutMs'
    | 'home'
    | 'port'
    | 'version'
    | 'startedAt'
    | 'database'
  >;
  self: Pick<AnyActorRef, 'system'>;
};

type ServerInput = (source: ServerSource) => HttpServerOptions;
export const serverInput: ServerInput = ({ context, self }) => ({
  createId: context.createId,
  now: context.now,
  installations: context.installations,
  sessions: requireOpenSessions(self.system),
  databaseWriter: requireDatabaseWriter(self.system),
  syncSupervisor: requireSyncSupervisor(self.system),
  commandAdmission: context.commandAdmission,
  acp: context.acp,
  loginTimeoutMs: context.loginTimeoutMs,
  loginCleanupTimeoutMs: context.loginCleanupTimeoutMs,
  ...serverIdentity(context),
  database: openDatabaseOf(context),
});

export const cleanupInput = ({
  context,
  self,
}: {
  context: Pick<EngineContext, 'acpResources' | 'server' | 'installations'>;
  self: Pick<AnyActorRef, 'system'>;
}): CloseAcpResourcesInput => ({
  resources: context.acpResources,
  server: context.server,
  installations: context.installations,
  sessions: findMachineActor(self.system, openSessionsId, openSessionsMachine),
});

function serverIdentity(
  context: Pick<EngineContext, 'home' | 'port' | 'version' | 'startedAt'>,
): Pick<HttpServerOptions, 'home' | 'port' | 'version' | 'startedAt'> {
  return {
    home: context.home,
    port: context.port,
    version: context.version,
    startedAt: context.startedAt,
  };
}
