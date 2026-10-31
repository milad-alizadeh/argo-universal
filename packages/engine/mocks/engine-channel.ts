import type { PairingClaim } from '@repo/contracts';
import type { TRPCClient } from '@trpc/client';
import type { AppRouter } from '../src/engine/router';
import type { ChannelSocket } from '../src/pairing/channel-socket';
import {
  connectChannel,
  type ChannelInput,
  type OpenedChannel,
} from '../src/pairing/connect-channel';
import { generateKeypair, type Keypair } from '../src/pairing/x25519';
import { callerOverChannel } from './channel-fetch';

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
}

export interface ChannelTestHost {
  url: string;
  caller: { devices: { serverKey: () => Promise<{ publicKey: string }> } };
}

/*
 * Opens a channel to a started Engine the way an App does: a real socket, the shipped handshake, and the Pairing Ticket spent when this Device Key has no row yet (ADR-0045).
 * The socket stays open, so a test can watch what the Server does with it. A Device the Server refuses gets none: this rejects with the refusal instead.
 */
export async function openChannel(
  host: ChannelTestHost,
  options: TestDeviceOptions = {},
): Promise<OpenedChannel> {
  return connectChannel(await channelInput(host, options));
}

// The same, as the caller every Engine test reads the Server through; its handshake is spent, so later calls authenticate with the Device Key alone.
export async function connectAsDevice(
  host: ChannelTestHost,
  options: TestDeviceOptions = {},
): Promise<TestDevice> {
  const input = await channelInput(host, options);
  const opened = await connectChannel(input);

  opened.socket.destroy();

  const later = { ...input, claim: claimFrom({}) };

  return {
    deviceId: opened.deviceId,
    deviceKey: input.deviceKey,
    channel: later,
    caller: callerOverChannel(later),
  };
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
