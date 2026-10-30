import { createServer, type Server } from 'node:http';
import type { Database } from '@repo/db';
import type { AcpResourceInput, RegistryActor } from '../agents';
import { blobsFolderIn } from '../blob';
import { ensureServerIdentity } from '../devices';
import { Notifications, type NotificationOptions } from '../notifications';
import type { OperationWaitClock, SessionTokens } from '../operations';
import { ensureControlToken } from '../operations';
import { type HookPort, type PluginServerOptions, Plugins } from '../plugins';
import type { OpenSessionsActorRef } from '../sessions';
import type { WriterActorRef } from '../storage';
import { readServerId } from '../system';
import { createHttpCaller, type HttpCaller } from './http-callers';
import {
  admitClose,
  connectWebSockets,
  listenOnLoopback,
} from './http-connections';
import { httpRouterInput } from './http-router-input';
import { createRequestGuard } from './request-guard';
import {
  createRequestListener,
  type RequestListenerOptions,
} from './request-listener';
import { type AppRouter, createAppRouter } from './router';
import { createAppRouterDeps } from './router-deps';

export interface HttpServerOptions extends PluginServerOptions {
  home: string;
  userHome?: string;
  sessionTokens: SessionTokens;
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
  operationWaitClock?: OperationWaitClock;
  // Where Sessions reach Plugin Hooks; the Plugin runtime attaches to it while the server runs.
  hookPort?: HookPort;
}

export interface HttpServer {
  notifications: Notifications;
  createCaller: HttpCaller;
  close: () => Promise<void>;
}

export type HttpSetup = {
  plugins: Plugins;
  blobsFolder: string;
  commandAdmission: AbortController;
  notifications: Notifications;
};

type RoutedSetup = HttpSetup & { appRouter: AppRouter };

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
  setup: RoutedSetup,
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
  setup: RoutedSetup,
  closeConnections: () => Promise<void>,
): Promise<void> {
  setup.notifications.close();
  await Promise.all([closeConnections(), setup.plugins.close()]);
}

async function prepareHttpServer(
  options: HttpServerOptions,
): Promise<RoutedSetup> {
  const serverId = await readServerId(options.database, options.databaseWriter);
  const setup = prepareHttpSetup(options, serverId);

  const controlToken = await ensureControlToken(options.home);
  const serverPublicKey = await ensureServerIdentity(options);
  const input = httpRouterInput(options, setup, controlToken);

  return {
    ...setup,
    appRouter: createAppRouter(
      createAppRouterDeps({ ...input, serverPublicKey }),
    ),
  };
}

function prepareHttpSetup(
  options: HttpServerOptions,
  serverId: string,
): HttpSetup {
  return {
    blobsFolder: blobsFolderIn(options.home),
    commandAdmission: options.commandAdmission ?? new AbortController(),
    notifications: new Notifications({ ...options, serverId }),
    plugins: new Plugins(options),
  };
}

// Binding the port is all the Supervisor waits for, so a slow background Plugin delays no App.
async function listenWithPlugins(
  server: Server,
  port: number,
  setup: RoutedSetup,
): Promise<void> {
  try {
    await listenOnLoopback(server, port);
  } catch (error) {
    setup.notifications.close();
    await setup.plugins.close();
    throw error;
  }

  setup.plugins.listening();
}

function listenerOptions(
  setup: RoutedSetup,
  guard: ReturnType<typeof createRequestGuard>,
): RequestListenerOptions {
  return {
    guard,
    blobsFolder: setup.blobsFolder,
    router: setup.appRouter,
    readAsset: setup.plugins.openAsset,
  };
}
