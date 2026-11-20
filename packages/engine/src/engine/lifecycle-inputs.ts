import { writeLog } from '@repo/machine-log';
import type { AnyActorRef, InputFrom } from 'xstate';
import {
  createInstalledAgents,
  defaultInstallPorts,
  type InstalledAgents,
} from '../agents';
import { blobsFolderIn } from '../blob';
import {
  defaultConversationProvider,
  sessionBriefing,
  type ConversationInput,
} from '../conversation';
import { findMachineActor } from '../lib/machine-actor';
import {
  openSessionsId,
  openSessionsMachine,
  sessionActorId,
  type OpenSessionsInput,
} from '../sessions';
import type { writerMachine } from '../storage';
import type { CloseAcpResourcesInput } from './agent-cleanup';
import type { RecoveryInput } from './engine-recovery';
import { requireRegistry } from './registry-input';
import {
  openDatabaseOf,
  requireDatabaseWriter,
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

type SessionsSource = {
  context: Pick<
    EngineContext,
    | 'database'
    | 'home'
    | 'now'
    | 'createId'
    | 'acpResources'
    | 'installationPorts'
    | 'hookPort'
  >;
};

// Built once for the Engine's life; the HTTP router reads it from the open Sessions.
const installedAgentsInput = ({
  context,
  self,
}: SessionsSource & {
  self: Pick<AnyActorRef, 'system'>;
}): InstalledAgents =>
  createInstalledAgents({
    database: openDatabaseOf(context),
    home: context.home,
    registry: requireRegistry(self.system),
    resources: context.acpResources,
    ports: context.installationPorts ?? defaultInstallPorts,
  });

export const sessionsInput = ({
  context,
  self,
}: SessionsSource & {
  self: Pick<AnyActorRef, 'system'>;
}): OpenSessionsInput => ({
  database: openDatabaseOf(context),
  runtimeDirectory: context.home,
  now: context.now,
  createId: context.createId,
  acpResources: context.acpResources,
  installedAgents: installedAgentsInput({ context, self }),
  hooks: context.hookPort.hooks,
  writer: requireDatabaseWriter(self.system),
});

// A Conversation provider the Engine was given, null included, or the default one.
const conversationProviderOf = (
  given: EngineContext['conversationProvider'],
): ConversationInput['provider'] =>
  given === undefined ? defaultConversationProvider(process.env) : given;

const conversationLogOf =
  (home: string) =>
  (line: string): void =>
    writeLog({ home, label: 'conversation', line });

// A Session is open while its actor runs in the Engine's system.
const sessionOpenIn =
  (system: AnyActorRef['system']) =>
  (sessionId: string): boolean =>
    system.get(sessionActorId(sessionId)) !== undefined;

type ConversationInputArgs = {
  context: Pick<
    EngineContext,
    'database' | 'home' | 'now' | 'conversationProvider' | 'voiceIdleMs'
  >;
  self: Pick<AnyActorRef, 'system'>;
};

export const conversationInput = ({
  context,
  self,
}: ConversationInputArgs): ConversationInput => ({
  provider: conversationProviderOf(context.conversationProvider),
  briefing: sessionBriefing(openDatabaseOf(context)),
  idleMs: context.voiceIdleMs,
  log: conversationLogOf(context.home),
  now: context.now,
  sessionOpen: sessionOpenIn(self.system),
});

export { serverInput } from './server-input';

export const cleanupInput = ({
  context,
  self,
}: {
  context: Pick<EngineContext, 'acpResources'>;
  self: Pick<AnyActorRef, 'system'>;
}): CloseAcpResourcesInput => ({
  resources: context.acpResources,
  sessions: findMachineActor(self.system, openSessionsId, openSessionsMachine),
});
