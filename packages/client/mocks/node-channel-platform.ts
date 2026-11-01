import { randomBytes } from 'node:crypto';
import { connect } from 'node:net';
import type { PairingClaim, PairingRegistration } from '@repo/contracts';
import type { ByteSocket } from '../src/features/connection/api/channel/byte-socket';
import type { ChannelPlatform } from '../src/features/connection/api/channel/channel-transport';
import {
  openChannel,
  type ChannelInput,
} from '../src/features/connection/api/channel/open-channel';
import {
  keypairFromPrivateKey,
  type Keypair,
} from '../src/features/connection/api/channel/x25519';
import type { PairedEndpoint } from '../src/features/connection/api/server-endpoint';

const keyBytes = 32;

export const nodeRandomBytes = (length: number): Uint8Array =>
  new Uint8Array(randomBytes(length));

export const newDeviceKey = (): Keypair =>
  keypairFromPrivateKey(nodeRandomBytes(keyBytes));

type Socket = ReturnType<typeof connect>;

function adapter(socket: Socket): ByteSocket {
  const bytes: ByteSocket = {
    write: (data) => void socket.write(data),
    close: () => void socket.destroy(),
    onData: () => {},
    onClose: () => {},
  };

  socket.on('data', (chunk) => bytes.onData(new Uint8Array(chunk)));
  socket.on('close', () => bytes.onClose());
  socket.on('error', (error) => bytes.onClose(error));

  return bytes;
}

const openSocket: ChannelPlatform['openSocket'] = (address) =>
  new Promise((resolve, reject) => {
    const socket = connect(address.port, address.host, () =>
      resolve(adapter(socket)),
    );

    socket.once('error', reject);
  });

export interface NodeDevice {
  deviceKey?: Keypair;
  claim?: Partial<PairingClaim>;
}

/*
 * The App's sockets and randomness, taken from Node: a real TCP socket to a real Engine, which is as close to a phone as a test here gets. Only the socket module differs on a phone.
 */
export const nodeChannelPlatform = (
  device: NodeDevice = {},
): ChannelPlatform => {
  const key = device.deviceKey ?? newDeviceKey();

  return {
    openSocket,
    randomBytes: nodeRandomBytes,
    deviceKey: async () => key,
    claim: () => ({ name: 'Test phone', platform: 'android', ...device.claim }),
  };
};

// The slice of a started Engine a Device pairs with.
export interface PairableHost {
  url: string;
  caller: {
    devices: { serverKey: () => Promise<{ publicKey: string }> };
    pairing: {
      registered: () => Promise<AsyncIterable<PairingRegistration>>;
      allow: (input: { deviceId: string }) => Promise<unknown>;
    };
  };
  pairing: { mint: () => { ticket: string } };
}

export const endpointOf = async (
  host: PairableHost,
): Promise<PairedEndpoint> => ({
  host: '127.0.0.1',
  port: Number(new URL(host.url).port),
  serverPublicKey: (await host.caller.devices.serverKey()).publicKey,
});

const inputFor = async (
  platform: ChannelPlatform,
  { port }: PairedEndpoint,
  { serverPublicKey }: PairedEndpoint,
): Promise<ChannelInput> => ({
  address: { host: '127.0.0.1', port },
  serverPublicKey,
  deviceKey: await platform.deviceKey(),
  claim: platform.claim(),
  randomBytes: platform.randomBytes,
});

// Opens a channel as `platform` says this Device is, to the Server at `host`.
export async function openAs(
  host: PairableHost,
  platform: ChannelPlatform,
  serverHost: PairableHost = host,
): ReturnType<typeof openChannel> {
  const input = await inputFor(
    platform,
    await endpointOf(host),
    await endpointOf(serverHost),
  );

  return allowed(host, openChannel(input, platform.openSocket), input.claim);
}

/*
 * The owner pressing Allow: the Server holds a Device that spends a Pairing Ticket until they do, so a test that pairs is waiting on this.
 * A Device with no Ticket never waits, and one the Server refuses outright has nobody to answer.
 */
async function allowed<T>(
  host: PairableHost,
  connecting: Promise<T>,
  claim: PairingClaim,
): Promise<T> {
  if (!claim.ticket) return connecting;
  const stream = await host.caller.pairing.registered();
  const asking = await Promise.race([
    stream[Symbol.asyncIterator]().next(),
    connecting.then(() => undefined, () => undefined),
  ]);

  if (asking?.done === false)
    await host.caller.pairing.allow({ deviceId: asking.value.deviceId });

  return connecting;
}

// A Device that has paired: its first Connection spent a Pairing Ticket, and every one after it is the Device Key alone.
export async function pairedNodeDevice(
  host: PairableHost,
): Promise<NodeDevice> {
  const device = { deviceKey: newDeviceKey() };
  const { ticket } = host.pairing.mint();

  (
    await openAs(host, nodeChannelPlatform({ ...device, claim: { ticket } }))
  ).stream.close();

  return device;
}
