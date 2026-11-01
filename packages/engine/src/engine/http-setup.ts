import { AppNavigation } from '../app-navigation';
import { blobsFolderIn } from '../blob';
import { ensureServerIdentity } from '../devices';
import { DeviceAdmission } from '../devices/admit-device';
import { LocalNetworkAccess } from '../network-access';
import { Notifications } from '../notifications';
import { ensureControlToken } from '../operations';
import { PairingRegistrations } from '../pairing/registrations';
import { PairingTickets } from '../pairing/tickets';
import { Plugins } from '../plugins';
import { readServerId } from '../system';
import { discoveryNameOf } from './announce-server';
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
  const identity = await ensureServerIdentity(options);
  const pairing = preparePairing(options);

  return routed({ options, setup, controlToken, pairing }, identity);
}

type ServerIdentity = Awaited<ReturnType<typeof ensureServerIdentity>>;

// What the Server's own identity adds to the setup: the key the handshake runs on, and the router built over both.
const routed = (
  sources: Omit<RouterSources, 'publicKey'>,
  { keypair, publicKey }: ServerIdentity,
): RoutedSetup => ({
  ...sources.setup,
  ...sources.pairing,
  controlToken: sources.controlToken,
  serverPublicKey: publicKey,
  staticKey: keypair,
  appRouter: routerFor({ ...sources, publicKey }),
});

interface RouterSources {
  readonly options: HttpServerOptions;
  readonly setup: HttpSetup;
  readonly controlToken: string;
  readonly publicKey: string;
  readonly pairing: Pairing;
}

const routerFor = (sources: RouterSources): RoutedSetup['appRouter'] =>
  createAppRouter(createAppRouterDeps(routerInput(sources)));

// What the Server's own identity adds to the router's dependencies: its static public key, the name it is announced by, and the Pairing Tickets and registrations it shares with the channel.
const routerInput = ({
  options,
  setup,
  controlToken,
  publicKey,
  pairing,
}: RouterSources): Parameters<typeof createAppRouterDeps>[0] => ({
  ...httpRouterInput(options, setup, controlToken),
  serverPublicKey: publicKey,
  discoveryName: discoveryNameOf(options),
  tickets: pairing.tickets,
  registrations: pairing.registrations,
});

type Pairing = Pick<RoutedSetup, 'tickets' | 'registrations' | 'admission'>;

/*
 * The one set of Pairing Tickets a Server has outstanding, and the one place a registration is reported to.
 * The pair sheet mints through the router and a connecting Device spends through the channel, so both sides must hold the same ones.
 */
function preparePairing(options: HttpServerOptions): Pairing {
  const now = options.now ?? Date.now;
  const tickets = new PairingTickets(now);
  const registrations = new PairingRegistrations();

  return {
    tickets,
    registrations,
    admission: admitting(options, { tickets, registrations }, now),
  };
}

const admitting = (
  options: HttpServerOptions,
  pairing: Pick<Pairing, 'tickets' | 'registrations'>,
  now: () => number,
): DeviceAdmission =>
  new DeviceAdmission({
    database: options.database,
    databaseWriter: options.databaseWriter,
    createId: options.createId,
    tickets: pairing.tickets,
    registrations: pairing.registrations,
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
    appNavigation: new AppNavigation({ serverId }),
    localNetworkAccess: networkAccessOf(options),
  };
}

const networkAccessOf = (options: HttpServerOptions): LocalNetworkAccess =>
  new LocalNetworkAccess(options.database, options.databaseWriter);
