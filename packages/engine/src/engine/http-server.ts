import { createServer, type Server } from 'node:http';
import type { Database } from '@repo/db';
import { type AcpResourceInput } from '../agents';
import type { RegistryActor } from '../agents';
import { blobsFolderIn } from '../blob';
import { Notifications, type NotificationOptions } from '../notifications';
import {
  createPluginRuntime,
  type Keychain,
  type PluginRuntime,
} from '../plugins';
import type { OpenSessionsActorRef } from '../sessions';
import type { WriterActorRef } from '../storage';
import { readServerId } from '../system';
import {
  admitClose,
  connectWebSockets,
  listenOnLoopback,
} from './http-connections';
import { createRequestGuard } from './request-guard';
import { createRequestListener } from './request-listener';
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
  startedAt: string;
  database: Database;
  sessions: OpenSessionsActorRef;
  databaseWriter: WriterActorRef;
  commandAdmission?: AbortController;
  acp?: AcpResourceInput;
  notificationOptions?: NotificationOptions;
}

export interface HttpServer {
  notifications: Notifications;
  createCaller: (
    options?: Parameters<AppRouter['createCaller']>[1],
  ) => ReturnType<AppRouter['createCaller']>;
  close: () => Promise<void>;
}

type HttpSetup = {
  blobsFolder: string;
  commandAdmission: AbortController;
  pluginRuntime: PluginRuntime;
  notifications: Notifications;
};

// Serves tRPC and blobs on loopback (ADR 0002); resolves once the port is bound.
export async function startHttpServer(
  options: HttpServerOptions,
): Promise<HttpServer> {
  const setup = await prepareHttpServer(options);
  const guard = createRequestGuard(options.port);
  const server = createHttpListener(guard, setup.blobsFolder, setup.appRouter);

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
    createCaller: (options) => setup.appRouter.createCaller({}, options),
  };
}

async function closeHttpServices(
  setup: HttpSetup,
  closeConnections: () => Promise<void>,
): Promise<void> {
  setup.notifications.close();
  await Promise.all([closeConnections(), setup.pluginRuntime.close()]);
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
    pluginRuntime: createPluginRuntime(options.home, options.keychain),
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
      pluginRuntime: setup.pluginRuntime,
      notifications: setup.notifications,
    }),
  );
}

async function listenWithPlugins(
  server: Server,
  port: number,
  setup: Pick<HttpSetup, 'pluginRuntime' | 'notifications'>,
): Promise<void> {
  try {
    await listenOnLoopback(server, port);
  } catch (error) {
    setup.notifications.close();
    await setup.pluginRuntime.close();
    throw error;
  }
}

function createHttpListener(
  guard: ReturnType<typeof createRequestGuard>,
  blobsFolder: string,
  router: AppRouter,
): Server {
  return createServer(createRequestListener({ guard, blobsFolder, router }));
}
