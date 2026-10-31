import type { AnyActorRef } from 'xstate';
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
    | 'sessionTokens'
    | 'createId'
    | 'commandAdmission'
    | 'acp'
    | 'notificationOptions'
    | 'home'
    | 'userHome'
    | 'port'
    | 'firstPartyPluginsDirectory'
    | 'keychain'
    | 'pluginNetwork'
    | 'pluginOAuth'
    | 'pluginClock'
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

export const serverInput: ServerInput = ({ context, self }) => ({
  createId: context.createId,
  sessionTokens: context.sessionTokens,
  sessions: requireOpenSessions(self.system),
  databaseWriter: requireDatabaseWriter(self.system),
  registry: requireRegistry(self.system),
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
  | 'version'
  | 'startedAt'
  | 'notificationOptions'
  | 'firstPartyPluginsDirectory'
  | 'keychain'
  | 'pluginNetwork'
  | 'pluginOAuth'
  | 'pluginClock'
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
    keychain: context.keychain,
    pluginNetwork: context.pluginNetwork,
    ...pluginFlowOptions(context),
  };
}

function whereAndWhat(
  context: ServerConfiguration,
): Pick<ServerConfiguration, 'home' | 'port' | 'version' | 'startedAt'> {
  return {
    home: context.home,
    port: context.port,
    version: context.version,
    startedAt: context.startedAt,
  };
}

function pluginFlowOptions(
  context: ServerConfiguration,
): Pick<ServerConfiguration, 'pluginOAuth' | 'pluginClock'> {
  return { pluginOAuth: context.pluginOAuth, pluginClock: context.pluginClock };
}
