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
    | 'createId'
    | 'commandAdmission'
    | 'acp'
    | 'notificationOptions'
    | 'home'
    | 'port'
    | 'firstPartyPluginsDirectory'
    | 'version'
    | 'startedAt'
    | 'database'
  >;
  self: Pick<AnyActorRef, 'system'>;
};

type ServerInput = (source: ServerSource) => HttpServerOptions;

export const serverInput: ServerInput = ({ context, self }) => ({
  firstPartyPluginsDirectory: context.firstPartyPluginsDirectory,
  createId: context.createId,
  sessions: requireOpenSessions(self.system),
  databaseWriter: requireDatabaseWriter(self.system),
  registry: requireRegistry(self.system),
  commandAdmission: context.commandAdmission,
  acp: context.acp,
  ...serverConfiguration(context),
  database: openDatabaseOf(context),
});

type ServerConfiguration = Pick<
  HttpServerOptions,
  'home' | 'port' | 'version' | 'startedAt' | 'notificationOptions'
>;

function serverConfiguration(
  context: ServerConfiguration,
): ServerConfiguration {
  return {
    home: context.home,
    port: context.port,
    version: context.version,
    startedAt: context.startedAt,
    notificationOptions: context.notificationOptions,
  };
}
