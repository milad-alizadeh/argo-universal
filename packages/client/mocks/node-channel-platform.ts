import { randomBytes } from 'node:crypto';
import type { PairingClaim, PairingRegistration } from '@repo/contracts';
import type {
  ByteSocket,
  OpenSocket,
} from '../src/features/connection/api/channel/byte-socket';
import type {
  ChannelPlatform,
  DeviceClaim,
} from '../src/features/connection/api/channel/channel-transport';
import {
  openChannel,
  type ChannelInput,
} from '../src/features/connection/api/channel/open-channel';
import { openWebSocketCarrier } from '../src/features/connection/api/channel/web-socket-carrier';
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

export interface NodeDevice {
  deviceKey?: Keypair;
  claim?: Partial<DeviceClaim>;
}

/*
 * The App's sockets and randomness, taken from Node: the phone's own WebSocket carrier, on Node's WebSocket, to a real Engine, which is as close to a phone as a test here gets.
 */
export const nodeChannelPlatform = (
  device: NodeDevice = {},
): ChannelPlatform => {
  const key = device.deviceKey ?? newDeviceKey();

  return {
    openSocket: openWebSocketCarrier,
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
      allow: (input: { deviceId: string }) => Promise<void>;
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

interface Inputs {
  platform: ChannelPlatform;
  // Where the channel is opened, and the Server whose key it expects: the same unless a test opens to one Server with another's key.
  at: PairedEndpoint;
  expecting: PairedEndpoint;
  ticket?: string;
}

const inputFor = async (inputs: Inputs): Promise<ChannelInput> => ({
  address: { host: '127.0.0.1', port: inputs.at.port },
  serverPublicKey: inputs.expecting.serverPublicKey,
  deviceKey: await inputs.platform.deviceKey(),
  claim: { ...inputs.platform.claim(), ticket: inputs.ticket },
  randomBytes: inputs.platform.randomBytes,
});

// Opens a channel as `platform` says this Device is, to the Server at `host`.
export async function openAs(
  host: PairableHost,
  platform: ChannelPlatform,
  options: { serverHost?: PairableHost; ticket?: string } = {},
): ReturnType<typeof openChannel> {
  const input = await inputFor({
    platform,
    at: await endpointOf(host),
    expecting: await endpointOf(options.serverHost ?? host),
    ticket: options.ticket,
  });

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
  if (claim.ticket) await allowFirst(host, connecting);

  return connecting;
}

const nobodyAsking = (): IteratorResult<PairingRegistration> => ({
  done: true,
  value: undefined,
});

async function allowFirst(
  host: PairableHost,
  connecting: Promise<unknown>,
): Promise<void> {
  const stream = await host.caller.pairing.registered();

  const first = await Promise.race([
    stream[Symbol.asyncIterator]().next(),
    connecting.then(nobodyAsking, nobodyAsking),
  ]);

  if (!first.done)
    await host.caller.pairing.allow({ deviceId: first.value.deviceId });
}

// A Device that has paired: its first Connection spent a Pairing Ticket, and every one after it is the Device Key alone.
export async function pairedNodeDevice(
  host: PairableHost,
): Promise<NodeDevice> {
  const device = { deviceKey: newDeviceKey() };
  const { ticket } = host.pairing.mint();

  (await openAs(host, nodeChannelPlatform(device), { ticket })).stream.close();

  return device;
}

const nobody = (): void => {};

export interface Silenceable {
  openSocket: OpenSocket;
  sockets: ByteSocket[];
  // From now on the first socket opened swallows everything in both directions and never closes, as one does after a Wi-Fi change.
  silence: () => void;
  // Closes every socket opened, the silenced one included.
  close: () => void;
}

export function silenceable(open: OpenSocket): Silenceable {
  const real: ByteSocket[] = [];
  const sockets: ByteSocket[] = [];
  let silent = false;

  const openSocket: OpenSocket = async (to) => {
    const socket = await open(to);
    const first = real.length === 0;
    const heard = (): boolean => !(first && silent);

    const wrapper: ByteSocket = {
      write: (data): void => {
        if (heard()) socket.write(data);
      },
      close: (): void => socket.close(),
      onData: nobody,
      onClose: nobody,
    };

    socket.onData = (chunk): void => {
      if (heard()) wrapper.onData(chunk);
    };

    socket.onClose = (error): void => wrapper.onClose(error);

    real.push(socket);
    sockets.push(wrapper);

    return wrapper;
  };

  return {
    openSocket,
    sockets,
    silence: (): void => {
      silent = true;
    },
    close: (): void => {
      for (const socket of real) socket.close();
    },
  };
}
