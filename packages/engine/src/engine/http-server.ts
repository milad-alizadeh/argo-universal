import { createServer, type Server } from 'node:http';
import type { Database } from '@repo/db';
import type { AcpResourceInput, RegistryActor } from '../agents';
import { blobsFolderIn } from '../blob';
import { Notifications, type NotificationOptions } from '../notifications';
import type { HookPort, Keychain, PluginNetwork } from '../plugins';
import type { OpenSessionsActorRef } from '../sessions';
import type { WriterActorRef } from '../storage';
import { readServerId } from '../system';
import { createHttpCaller, type HttpCaller } from './http-callers';
import {
  admitClose,
  connectWebSockets,
  listenOnLoopback,
} from './http-connections';
import { closePlugins, startPlugins, type PluginSetup } from './plugin-setup';
import { createRequestGuard } from './request-guard';
import {
  createRequestListener,
  type RequestListenerOptions,
} from './request-listener';
import { type AppRouter, createAppRouter } from './router';
import { createAppRouterDeps } from './router-deps';

export interface HttpServerOptions {
  home: string;
  registry: RegistryActor;
  createId: () => string;
  port: number;
  version: string;
  firstPartyPluginsDirectory?: string;
  keychain?: Keychain;
  pluginNetwork?: PluginNetwork;
  startedAt: string;
  database: Database;
  sessions: OpenSessionsActorRef;
  databaseWriter: WriterActorRef;
  commandAdmission?: AbortController;
  acp?: AcpResourceInput;
  notificationOptions?: NotificationOptions;
  // Where Sessions reach Plugin Hooks; the Plugin runtime attaches to it while the server runs.
  hookPort?: HookPort;
}

export interface HttpServer {
  notifications: Notifications;
  createCaller: HttpCaller;
  close: () => Promise<void>;
}

type HttpSetup = PluginSetup & {
  blobsFolder: string;
  commandAdmission: AbortController;
  notifications: Notifications;
};

// Serves tRPC and blobs on loopback (ADR 0002); resolves once the port is bound.
export async function startHttpServer(
  options: HttpServerOptions,
): Promise<HttpServer> {
  const setup = await prepareHttpServer(options);
  const guard = createRequestGuard(options.port);

  const server = createServer(
    createRequestListener(listenerOptions(setup, guard)),
  );

  await listenWithPlugins(server, options.port, setup);

  return connectHttpServer(setup, server, guard);
}

function connectHttpServer(
  setup: HttpSetup & { appRouter: AppRouter },
  server: Server,
  guard: ReturnType<typeof createRequestGuard>,
): HttpServer {
  const closeConnections = connectWebSockets(server, setup.appRouter, guard);

  return {
    notifications: setup.notifications,
    close: admitClose(setup.commandAdmission, () =>
      closeHttpServices(setup, closeConnections),
    ),
    createCaller: createHttpCaller(setup),
  };
}

async function closeHttpServices(
  setup: HttpSetup,
  closeConnections: () => Promise<void>,
): Promise<void> {
  setup.notifications.close();
  await Promise.all([closeConnections(), closePlugins(setup)]);
}

async function prepareHttpServer(
  options: HttpServerOptions,
): Promise<HttpSetup & { appRouter: AppRouter }> {
  const serverId = await readServerId(options.database, options.databaseWriter);
  const setup = prepareHttpSetup(options, serverId);

  return { ...setup, appRouter: createHttpRouter(options, setup) };
}

function prepareHttpSetup(
  options: HttpServerOptions,
  serverId: string,
): HttpSetup {
  return {
    blobsFolder: blobsFolderIn(options.home),
    commandAdmission: options.commandAdmission ?? new AbortController(),
    notifications: new Notifications({ ...options, serverId }),
    ...startPlugins(options),
  };
}

function createHttpRouter(
  options: HttpServerOptions,
  setup: HttpSetup,
): AppRouter {
  return createAppRouter(
    createAppRouterDeps({
      ...options,
      blobsFolder: setup.blobsFolder,
      sessionCommandSignal: setup.commandAdmission.signal,
      notifications: setup.notifications,
      ...pluginDeps(setup),
    }),
  );
}

type PluginDeps = Pick<HttpSetup, 'pluginRuntime' | 'pluginSettings'> & {
  hooks: HookPort['hooks'];
};

const pluginDeps = (setup: HttpSetup): PluginDeps => ({
  pluginRuntime: setup.pluginRuntime,
  pluginSettings: setup.pluginSettings,
  hooks: setup.hookPort.hooks,
});

async function listenWithPlugins(
  server: Server,
  port: number,
  setup: HttpSetup,
): Promise<void> {
  try {
    await listenOnLoopback(server, port);
  } catch (error) {
    setup.notifications.close();
    await closePlugins(setup);
    throw error;
  }
}

function listenerOptions(
  setup: HttpSetup & { appRouter: AppRouter },
  guard: ReturnType<typeof createRequestGuard>,
): RequestListenerOptions {
  return {
    guard,
    blobsFolder: setup.blobsFolder,
    router: setup.appRouter,
    readAsset: setup.pluginRuntime.openAsset,
  };
}
