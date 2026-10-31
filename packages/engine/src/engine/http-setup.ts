import { blobsFolderIn } from '../blob';
import { ensureServerIdentity } from '../devices';
import { DeviceAdmission } from '../devices/admit-device';
import { LocalNetworkAccess } from '../network-access';
import { Notifications } from '../notifications';
import { ensureControlToken } from '../operations';
import { PairingTickets } from '../pairing/tickets';
import { Plugins } from '../plugins';
import { readServerId } from '../system';
import { httpRouterInput } from './http-router-input';
import type { HttpServerOptions, HttpSetup, RoutedSetup } from './http-server';
import { createAppRouter } from './router';
import { createAppRouterDeps } from './router-deps';

// Everything the Server holds for its whole life: its storage, its Plugins, its identity and the Pairing Tickets it has outstanding.
export async function prepareHttpServer(
  options: HttpServerOptions,
): Promise<RoutedSetup> {
  const setup = await prepareHttpSetup(options);
  const controlToken = await ensureControlToken(options.home);
  const { keypair, publicKey } = await ensureServerIdentity(options);

  return {
    ...setup,
    ...pairing(options),
    controlToken,
    serverPublicKey: publicKey,
    staticKey: keypair,
    appRouter: routerFor({ options, setup, controlToken, publicKey }),
  };
}

interface RouterSources {
  readonly options: HttpServerOptions;
  readonly setup: HttpSetup;
  readonly controlToken: string;
  readonly publicKey: string;
}

const routerFor = ({
  options,
  setup,
  controlToken,
  publicKey,
}: RouterSources): RoutedSetup['appRouter'] =>
  createAppRouter(
    createAppRouterDeps({
      ...httpRouterInput(options, setup, controlToken),
      serverPublicKey: publicKey,
    }),
  );

function pairing(
  options: HttpServerOptions,
): Pick<RoutedSetup, 'tickets' | 'admission'> {
  const now = options.now ?? Date.now;
  const tickets = new PairingTickets(now);

  return { tickets, admission: admitting(options, tickets, now) };
}

const admitting = (
  options: HttpServerOptions,
  tickets: PairingTickets,
  now: () => number,
): DeviceAdmission =>
  new DeviceAdmission({
    database: options.database,
    databaseWriter: options.databaseWriter,
    createId: options.createId,
    tickets,
    now,
  });

async function prepareHttpSetup(
  options: HttpServerOptions,
): Promise<HttpSetup> {
  const serverId = await readServerId(options.database, options.databaseWriter);

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
