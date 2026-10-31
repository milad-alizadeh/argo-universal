import { createServer, type Server } from 'node:http';
import type { Database } from '@repo/db';
import type { AcpResourceInput, RegistryActor } from '../agents';
import { blobsFolderIn } from '../blob';
import { ensureServerIdentity } from '../devices';
import { LocalNetworkAccess } from '../network-access';
import { Notifications, type NotificationOptions } from '../notifications';
import type { OperationWaitClock, SessionTokens } from '../operations';
import { ensureControlToken } from '../operations';
import { type HookPort, type PluginServerOptions, Plugins } from '../plugins';
import type { OpenSessionsActorRef } from '../sessions';
import type { WriterActorRef } from '../storage';
import { readServerId } from '../system';
import { createHttpCaller, type HttpCaller } from './http-callers';
import { admitClose, connectWebSockets } from './http-connections';
import { listenWithPlugins } from './http-listen';
import { httpRouterInput } from './http-router-input';
import type { ServerListener } from './network-listener';
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
  // Whether the Server is reachable beyond this computer; the Engine reads it and subscribes to change.
  localNetworkAccess: LocalNetworkAccess;
  // Where the Server is listening now, as `address:port`.
  listeningOn: () => string;
  notifications: Notifications;
  createCaller: HttpCaller;
  close: () => Promise<void>;
}

export type HttpSetup = {
  plugins: Plugins;
  blobsFolder: string;
  commandAdmission: AbortController;
  notifications: Notifications;
  localNetworkAccess: LocalNetworkAccess;
};

export type RoutedSetup = HttpSetup & { appRouter: AppRouter };

type Listening = {
  guard: ReturnType<typeof createRequestGuard>;
  listener: ServerListener;
};

// Serves tRPC and blobs on loopback, or on the local network once the owner turns that on (ADR 0002, ADR 0045); resolves once the port is bound.
export async function startHttpServer(
  options: HttpServerOptions,
): Promise<HttpServer> {
  const setup = await prepareHttpServer(options);
  const guard = createRequestGuard(options.port, setup.localNetworkAccess);

  const server = createServer(
    createRequestListener(listenerOptions(setup, guard)),
  );

  const listener = await listenWithPlugins(server, options.port, setup);
  setup.localNetworkAccess.useBinding(listener.rebind);

  return connectHttpServer(setup, server, { guard, listener });
}

function connectHttpServer(
  setup: RoutedSetup,
  server: Server,
  { guard, listener }: Listening,
): HttpServer {
  const closeConnections = connectWebSockets(server, setup.appRouter, guard);

  return {
    localNetworkAccess: setup.localNetworkAccess,
    notifications: setup.notifications,
    listeningOn: listener.where,
    close: closeWith(setup, listener, closeConnections),
    createCaller: createHttpCaller(setup),
  };
}

// After the close starts the listener never binds again, so a change racing it cannot reopen the port.
function closeWith(
  setup: RoutedSetup,
  listener: ServerListener,
  closeConnections: () => Promise<void>,
): () => Promise<void> {
  return admitClose(setup.commandAdmission, () => {
    listener.stop();

    return closeHttpServices(setup, closeConnections);
  });
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
    localNetworkAccess: new LocalNetworkAccess(
      options.database,
      options.databaseWriter,
    ),
  };
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
