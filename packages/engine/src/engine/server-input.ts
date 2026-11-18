import type { Database } from '@repo/db';
import type { AnyActorRef } from 'xstate';
import { VoiceSettingsStore } from '../voice';
import type { HttpServerOptions } from './http-server';
import { requireRegistry } from './registry-input';
import {
  openDatabaseOf,
  requireDatabaseWriter,
  requireOpenSessions,
  type EngineContext,
} from './setup.machine';
import { requireVoiceCalls } from './voice-input';

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
  >;
  self: Pick<AnyActorRef, 'system'>;
};

type ServerInput = (source: ServerSource) => HttpServerOptions;

const voiceSettings = (
  system: AnyActorRef['system'],
  database: Database,
): VoiceSettingsStore =>
  new VoiceSettingsStore(database, requireDatabaseWriter(system));

// The actors the Server reaches the Engine through.
const engineActors = (
  system: AnyActorRef['system'],
  database: Database,
): Pick<
  HttpServerOptions,
  'sessions' | 'voice' | 'databaseWriter' | 'registry'
> => ({
  sessions: requireOpenSessions(system),
  voice: requireVoiceCalls(system, voiceSettings(system, database)),
  databaseWriter: requireDatabaseWriter(system),
  registry: requireRegistry(system),
});

export const serverInput: ServerInput = ({ context, self }) => ({
  createId: context.createId,
  sessionTokens: context.sessionTokens,
  ...engineActors(self.system, openDatabaseOf(context)),
  commandAdmission: context.commandAdmission,
  acp: context.acp,
  userHome: context.userHome,
  hookPort: context.hookPort,
  operationWaitClock: context.operationWaitClock,
  slashCommandsWaitMs: context.slashCommandsWaitMs,
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
