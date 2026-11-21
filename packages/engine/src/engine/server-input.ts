import type { Database } from '@repo/db';
import type { AnyActorRef } from 'xstate';
import { ConversationSettingsStore } from '../conversation';
import { requireConversations } from './conversation-input';
import type { HttpServerOptions } from './http-server';
import { requireRegistry } from './registry-input';
import {
  openDatabaseOf,
  requireDatabaseWriter,
  requireOpenSessions,
  type EngineContext,
} from './setup.machine';

type ServerSource = {
  context: Pick<
    EngineContext,
    | 'now'
    | 'sessionTokens'
    | 'createId'
    | 'commandAdmission'
    | 'acp'
    | 'notificationOptions'
    | 'home'
    | 'userHome'
    | 'port'
    | 'firstPartyPluginsDirectory'
    | 'secretStore'
    | 'pluginNetwork'
    | 'pluginOAuth'
    | 'pluginClock'
    | 'watchPlugins'
    | 'version'
    | 'startedAt'
    | 'database'
    | 'hookPort'
    | 'operationWaitClock'
    | 'slashCommandsWaitMs'
    | 'discoveryName'
    | 'terminalSpawner'
  >;
  self: Pick<AnyActorRef, 'system'>;
};

type ServerInput = (source: ServerSource) => HttpServerOptions;

const conversationSettings = (
  system: AnyActorRef['system'],
  database: Database,
): ConversationSettingsStore =>
  new ConversationSettingsStore(database, requireDatabaseWriter(system));

const conversationActor = (
  system: AnyActorRef['system'],
  database: Database,
  home: string,
): ReturnType<typeof requireConversations> =>
  requireConversations(system, conversationSettings(system, database), home);

// The actors the Server reaches the Engine through.
const engineActors = (
  system: AnyActorRef['system'],
  database: Database,
  home: string,
): Pick<
  HttpServerOptions,
  'sessions' | 'conversation' | 'databaseWriter' | 'registry'
> => ({
  sessions: requireOpenSessions(system),
  conversation: conversationActor(system, database, home),
  databaseWriter: requireDatabaseWriter(system),
  registry: requireRegistry(system),
});

export const serverInput: ServerInput = ({ context, self }) => ({
  createId: context.createId,
  sessionTokens: context.sessionTokens,
  ...engineActors(self.system, openDatabaseOf(context), context.home),
  commandAdmission: context.commandAdmission,
  acp: context.acp,
  userHome: context.userHome,
  hookPort: context.hookPort,
  operationWaitClock: context.operationWaitClock,
  slashCommandsWaitMs: context.slashCommandsWaitMs,
  terminalSpawner: context.terminalSpawner,
  ...serverConfiguration(context),
  database: openDatabaseOf(context),
});

type ServerConfiguration = Pick<
  HttpServerOptions,
  | 'home'
  | 'port'
  | 'now'
  | 'version'
  | 'startedAt'
  | 'notificationOptions'
  | 'firstPartyPluginsDirectory'
  | 'secretStore'
  | 'pluginNetwork'
  | 'pluginOAuth'
  | 'pluginClock'
  | 'watchPlugins'
  | 'discoveryName'
>;

function serverConfiguration(
  context: ServerConfiguration,
): ServerConfiguration {
  return {
    ...whereAndWhat(context),
    notificationOptions: context.notificationOptions,
    discoveryName: context.discoveryName,
    firstPartyPluginsDirectory: context.firstPartyPluginsDirectory,
    secretStore: context.secretStore,
    pluginNetwork: context.pluginNetwork,
    ...pluginFlowOptions(context),
  };
}

function whereAndWhat(
  context: ServerConfiguration,
): Pick<
  ServerConfiguration,
  'home' | 'port' | 'version' | 'startedAt' | 'now'
> {
  return {
    now: context.now,
    home: context.home,
    port: context.port,
    version: context.version,
    startedAt: context.startedAt,
  };
}

function pluginFlowOptions(
  context: ServerConfiguration,
): Pick<ServerConfiguration, 'pluginOAuth' | 'pluginClock' | 'watchPlugins'> {
  return {
    pluginOAuth: context.pluginOAuth,
    pluginClock: context.pluginClock,
    watchPlugins: context.watchPlugins,
  };
}
