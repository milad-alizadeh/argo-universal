import { createServer, type Server } from 'node:http';
import type { Database } from '@repo/db';
import type { AcpResourceInput, RegistryActor } from '../agents';
import type { LocalNetworkAccess } from '../network-access';
import type { NotificationOptions, Notifications } from '../notifications';
import type { OperationWaitClock, SessionTokens } from '../operations';
import type { HookPort, PluginServerOptions } from '../plugins';
import type { OpenSessionsActorRef } from '../sessions';
import type { WriterActorRef } from '../storage';
import { createHttpCaller, type HttpCaller } from './http-callers';
import { admitClose, connectWebSockets } from './http-connections';
import { prepareHttpServer, type RoutedSetup } from './http-setup';
import {
  listenForNetworkAccess,
  type ServerListener,
} from './network-listener';
import { createRequestGuard } from './request-guard';
import {
  createRequestListener,
  type RequestListenerOptions,
} from './request-listener';

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
    ...setup,
    listeningOn: listener.where,
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

// Binding the port is all the Supervisor waits for, so a slow background Plugin delays no App.
async function listenWithPlugins(
  server: Server,
  port: number,
  setup: RoutedSetup,
): Promise<ServerListener> {
  const listener = await bindOrCleanUp(server, port, setup);
  setup.plugins.listening();

  return listener;
}

async function bindOrCleanUp(
  server: Server,
  port: number,
  setup: RoutedSetup,
): Promise<ServerListener> {
  const { enabled } = setup.localNetworkAccess;

  try {
    return await listenForNetworkAccess(server, port, enabled);
  } catch (error) {
    await abandon(setup);
    throw error;
  }
}

async function abandon(setup: RoutedSetup): Promise<void> {
  setup.notifications.close();
  await setup.plugins.close();
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
