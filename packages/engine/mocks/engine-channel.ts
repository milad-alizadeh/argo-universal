import type { PairingClaim, PairingRegistration } from '@repo/contracts';
import type { TRPCClient } from '@trpc/client';
import type { AppRouter } from '../src/engine/router';
import type { ChannelSocket } from '../src/pairing/channel-socket';
import {
  connectChannel,
  type ChannelInput,
  type OpenedChannel,
} from '../src/pairing/connect-channel';
import { generateKeypair, type Keypair } from '../src/pairing/x25519';
import { callerOverChannel, getOverChannel } from './channel-fetch';

export interface TestDevice {
  // The row the Server made for this Device, or the one it already had.
  deviceId: string;
  caller: TRPCClient<AppRouter>;
  deviceKey: Keypair;
  // What it takes to open another channel as this Device, for a test that sends its own request.
  channel: ChannelInput;
}

export interface TestDeviceOptions {
  ticket?: string;
  deviceKey?: Keypair;
  name?: string;
  platform?: PairingClaim['platform'];
  // Which of this computer's addresses to knock on; loopback unless a test wants the Server reached the way another Device would.
  host?: string;
  // What the App was told the Server's static public key is; the Server's own unless a test gives it another.
  serverPublicKey?: string;
  /*
   * What the owner does on the pair sheet when a Device spends a Ticket: allow it (the default, so a test that only needs a Paired Device gets one),
   * refuse it, or say nothing and leave the Server holding the registration. A Device with no Ticket has nobody to answer for it.
   */
  answer?: Owner;
}

interface OwnerCaller {
  registered: () => Promise<AsyncIterable<PairingRegistration>>;
  allow: (input: { deviceId: string }) => Promise<void>;
  decline: (input: { deviceId: string }) => Promise<void>;
}

export interface ChannelTestHost {
  url: string;
  caller: {
    devices: { serverKey: () => Promise<{ publicKey: string }> };
    pairing: OwnerCaller;
  };
}

/*
 * Opens a channel to a started Engine the way an App does: a real socket, the shipped handshake, and the Pairing Ticket spent when this Device Key has no row yet (ADR-0045).
 * The socket stays open, so a test can watch what the Server does with it. A Device the Server refuses gets none: this rejects with the refusal instead.
 */
export async function openChannel(
  host: ChannelTestHost,
  options: TestDeviceOptions = {},
): Promise<OpenedChannel> {
  const input = await channelInput(host, options);

  return answered(host, options, connectChannel(input));
}

// The same, as the caller every Engine test reads the Server through; its handshake is spent, so later calls authenticate with the Device Key alone.
export async function connectAsDevice(
  host: ChannelTestHost,
  options: TestDeviceOptions = {},
): Promise<TestDevice> {
  const input = await channelInput(host, options);
  const opened = await answered(host, options, connectChannel(input));

  opened.socket.destroy();

  const later = { ...input, claim: claimFrom({}) };

  return {
    deviceId: opened.deviceId,
    deviceKey: input.deviceKey,
    channel: later,
    caller: callerOverChannel(later),
  };
}

type Owner = 'allow' | 'decline' | 'none';

// A Device with no Ticket has nobody to answer for it.
const ownerFor = (options: TestDeviceOptions): Owner =>
  options.ticket ? (options.answer ?? 'allow') : 'none';

const nobodyAsking = (): IteratorResult<PairingRegistration, undefined> => ({
  done: true,
  value: undefined,
});

/*
 * The owner answering the Device while it waits: the Server holds a Device's registration until they do, so the connection a test is waiting on only settles after this.
 * A Device the Server refuses outright never registers, so there is nothing to answer and the refusal is what comes back.
 * The stream it watches is left open: it ends with the host, and it only ever tells a watcher about a registration once.
 */
export async function answered<T>(
  host: ChannelTestHost,
  options: TestDeviceOptions,
  connecting: Promise<T>,
): Promise<T> {
  const owner = ownerFor(options);

  if (owner === 'none') return connecting;
  const first = await firstAsking(host, connecting);

  if (!first.done)
    await host.caller.pairing[owner]({ deviceId: first.value.deviceId });

  return connecting;
}

async function firstAsking(
  host: ChannelTestHost,
  connecting: Promise<unknown>,
): Promise<IteratorResult<PairingRegistration, undefined>> {
  const stream = await host.caller.pairing.registered();

  return Promise.race([
    stream[Symbol.asyncIterator]().next(),
    connecting.then(nobodyAsking, nobodyAsking),
  ]);
}

export const channelClosed = (socket: ChannelSocket): Promise<void> =>
  new Promise<void>((resolve): void => {
    socket.once('close', (): void => resolve());
  });

async function channelInput(
  host: ChannelTestHost,
  options: TestDeviceOptions,
): Promise<ChannelInput> {
  return {
    address: {
      host: options.host ?? '127.0.0.1',
      port: Number(new URL(host.url).port),
    },
    serverPublicKey: await staticKeyFor(host, options),
    deviceKey: options.deviceKey ?? generateKeypair(),
    claim: claimFrom(options),
  };
}

const staticKeyFor = async (
  host: ChannelTestHost,
  options: TestDeviceOptions,
): Promise<string> =>
  options.serverPublicKey ?? (await host.caller.devices.serverKey()).publicKey;

const claimFrom = (options: TestDeviceOptions): PairingClaim => ({
  ticket: options.ticket,
  name: options.name ?? 'Test iPhone',
  platform: options.platform ?? 'ios',
});

// The same Device reading a path the Server answers with bytes, such as a Blob, inside a channel of its own.
export async function readAsDevice(
  host: ChannelTestHost,
  options: TestDeviceOptions & { path: string },
): Promise<Response> {
  const input = await channelInput(host, options);

  return answered(host, options, getOverChannel(input, options.path));
}
