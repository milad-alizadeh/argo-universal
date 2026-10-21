import { createServer, type Server } from 'node:http';
import type { Database } from '@repo/db';
import type { AcpResourceInput, RegistryActor } from '../agents';
import { blobsFolderIn } from '../blob';
import { Notifications, type NotificationOptions } from '../notifications';
import type { HookPort } from '../plugins';
import type { OpenSessionsActorRef } from '../sessions';
import type { WriterActorRef } from '../storage';
import { readServerId } from '../system';
import { createHttpCaller, type HttpCaller } from './http-callers';
import {
  admitClose,
  connectWebSockets,
  listenOnLoopback,
} from './http-connections';
import type { PluginServerOptions } from './plugin-options';
import {
  closePlugins,
  startPlugins,
  type PluginSetup,
  pluginRouterDeps,
} from './plugin-setup';
import { createRequestGuard } from './request-guard';
import {
  createRequestListener,
  type RequestListenerOptions,
} from './request-listener';
import { type AppRouter, createAppRouter } from './router';
import { createAppRouterDeps } from './router-deps';

export interface HttpServerOptions extends PluginServerOptions {
  home: string;
  registry: RegistryActor;
  createId: () => string;
  port: number;
  version: string;
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

type RoutedSetup = HttpSetup & { appRouter: AppRouter };

// A bound Server holds the background start so closing never pulls the runtime out from under it.
type ListeningSetup = RoutedSetup & { backgroundStarted: Promise<void> };

// Serves tRPC and blobs on loopback (ADR 0002); resolves once the port is bound.
export async function startHttpServer(
  options: HttpServerOptions,
): Promise<HttpServer> {
  const setup = await prepareHttpServer(options);
  const guard = createRequestGuard(options.port);

  const server = createServer(
    createRequestListener(listenerOptions(setup, guard)),
  );

  const listening = await listenWithPlugins(server, options.port, setup);

  return connectHttpServer(listening, server, guard);
}

function connectHttpServer(
  setup: ListeningSetup,
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
  setup: ListeningSetup,
  closeConnections: () => Promise<void>,
): Promise<void> {
  setup.notifications.close();
  await Promise.all([closeConnections(), closePlugins(setup)]);
}

async function prepareHttpServer(
  options: HttpServerOptions,
): Promise<RoutedSetup> {
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
      ...pluginRouterDeps(setup),
    }),
  );
}

// Binding the port is all the Supervisor waits for, so a slow background Plugin delays no App.
async function listenWithPlugins(
  server: Server,
  port: number,
  setup: RoutedSetup,
): Promise<ListeningSetup> {
  try {
    await listenOnLoopback(server, port);
  } catch (error) {
    setup.notifications.close();
    await closePlugins(setup);
    throw error;
  }

  return { ...setup, backgroundStarted: setup.startBackground() };
}

function listenerOptions(
  setup: RoutedSetup,
  guard: ReturnType<typeof createRequestGuard>,
): RequestListenerOptions {
  return {
    guard,
    blobsFolder: setup.blobsFolder,
    router: setup.appRouter,
    readAsset: setup.pluginRuntime.openAsset,
  };
}
