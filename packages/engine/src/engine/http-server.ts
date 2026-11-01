import type { Database } from '@repo/db';
import type { AcpResourceInput, RegistryActor } from '../agents';
import type { AppNavigation } from '../app-navigation';
import type { DeviceAdmission } from '../devices/admit-device';
import type { OpenChannels } from '../devices/open-channels';
import type { LocalNetworkAccess } from '../network-access';
import type { Notifications, NotificationOptions } from '../notifications';
import {
  tokensMatch,
  type OperationWaitClock,
  type SessionTokens,
} from '../operations';
import type { PairingRegistrations } from '../pairing/registrations';
import type { PairingTickets } from '../pairing/tickets';
import type { Keypair } from '../pairing/x25519';
import type { HookPort, PluginServerOptions, Plugins } from '../plugins';
import type { OpenSessionsActorRef } from '../sessions';
import type { WriterActorRef } from '../storage';
import { announceServer } from './announce-server';
import { createDoors, type Doors } from './doors';
import { createHttpCaller, type HttpCaller } from './http-callers';
import { closeWith, type Listening } from './http-close';
import { connectWebSockets } from './http-connections';
import { listenWithPlugins } from './http-listen';
import { prepareHttpServer } from './http-setup';
import { createRequestGuard } from './request-guard';
import { type AppRouter } from './router';

export interface HttpServerOptions extends PluginServerOptions {
  home: string;
  userHome?: string;
  sessionTokens: SessionTokens;
  registry: RegistryActor;
  createId: () => string;
  // What the Server calls the time; a test moves it to let a Pairing Ticket expire.
  now?: () => number;
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
  // What an App lists this Server by; the computer's name unless a test says otherwise.
  discoveryName?: string;
}

export interface HttpServer {
  // Whether the Server is reachable beyond this computer; the Engine reads it and subscribes to change.
  localNetworkAccess: LocalNetworkAccess;
  // Where the Server is listening now, as `address:port`.
  listeningOn: () => string;
  notifications: Notifications;
  createCaller: HttpCaller;
  // The Pairing Tickets this Server has outstanding; the pair sheet mints one and a connecting Device spends it.
  pairing: PairingTickets;
  close: () => Promise<void>;
}

export type HttpSetup = {
  plugins: Plugins;
  blobsFolder: string;
  commandAdmission: AbortController;
  notifications: Notifications;
  localNetworkAccess: LocalNetworkAccess;
  appNavigation: AppNavigation;
};

export type RoutedSetup = HttpSetup & {
  appRouter: AppRouter;
  // The user token, which a request on the loopback door shows to prove it is the Server Device's (ADR-0044).
  controlToken: string;
  serverPublicKey: string;
  // The private half the handshake runs on; it never leaves the Server.
  staticKey: Keypair;
  tickets: PairingTickets;
  // Where a Device that has just registered is reported, so an open pair sheet can name it.
  registrations: PairingRegistrations;
  admission: DeviceAdmission;
  // The channels Paired Devices have open, which unpairing one ends.
  channels: OpenChannels;
};

// Serves tRPC and blobs to this computer's own App, and to a paired Device on the local network through the encrypted channel (ADR 0002, ADR 0045); resolves once the port is bound.
export async function startHttpServer(
  options: HttpServerOptions,
): Promise<HttpServer> {
  const setup = await prepareHttpServer(options);
  const guard = createRequestGuard(recognisedTokens(setup, options));
  const doors = createDoors(setup, guard);

  const listener = await listenWithPlugins(
    doors.frontDoor,
    options.port,
    setup,
  );

  setup.localNetworkAccess.useBinding(listener.rebind);

  const stopAnnouncing = announceServer(options, setup);

  return connectHttpServer(setup, doors, { guard, listener, stopAnnouncing });
}

/*
 * The tokens this Server issued: the user token in `~/.argo/control.token`, which the `argo` CLI and the Supervisor read, and the token each Session gives its Agent (ADR-0044).
 * A process that holds either read a file or an environment variable only this computer has, so a request carrying one is the Server Device's (#1696).
 */
const recognisedTokens = (
  setup: RoutedSetup,
  options: HttpServerOptions,
): Parameters<typeof createRequestGuard>[0] => ({
  recognisesToken: (token): boolean =>
    token !== undefined &&
    (tokensMatch(setup.controlToken, token) ||
      options.sessionTokens.recognises(token)),
});

function connectHttpServer(
  setup: RoutedSetup,
  doors: Doors,
  listening: Listening,
): HttpServer {
  const connections = connectionsOf(setup, doors, listening);

  return {
    ...served(setup),
    listeningOn: listening.listener.where,
    close: closeWith(setup, listening, connectWebSockets(connections)),
  };
}

const connectionsOf = (
  setup: RoutedSetup,
  doors: Doors,
  listening: Listening,
): Parameters<typeof connectWebSockets>[0] => ({
  ...listening,
  requests: doors.requests,
  router: setup.appRouter,
});

const served = (
  setup: RoutedSetup,
): Omit<HttpServer, 'listeningOn' | 'close'> => ({
  localNetworkAccess: setup.localNetworkAccess,
  notifications: setup.notifications,
  pairing: setup.tickets,
  createCaller: createHttpCaller(setup),
});
