import { writeLog } from '@repo/machine-log';
import type { AnyActorRef, InputFrom } from 'xstate';
import type { RegistryInput, SyncSupervisorInput } from '../agents';
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
import {
  openDatabaseOf,
  requireDatabaseWriter,
  type EngineContext,
} from './setup.machine';

export { serverInput } from './server-input';

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

export const syncInput = ({
  context,
  self,
}: {
  context: Pick<EngineContext, 'database' | 'fetchAgents' | 'now' | 'createId'>;
  self: Pick<AnyActorRef, 'system'>;
}): SyncSupervisorInput => ({
  database: openDatabaseOf(context),
  writer: requireDatabaseWriter(self.system),
  fetchAgents: context.fetchAgents,
  now: context.now,
  createId: context.createId,
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

export const registryInput = ({
  context,
  self,
}: {
  context: Pick<EngineContext, 'database' | 'fetchAgents' | 'now'>;
  self: Pick<AnyActorRef, 'system'>;
}): RegistryInput => ({
  database: openDatabaseOf(context),
  writer: requireDatabaseWriter(self.system),
  fetchAgents: context.fetchAgents,
  now: context.now,
});
