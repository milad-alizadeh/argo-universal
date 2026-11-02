import type { PairingClaim } from '@repo/contracts';
import type { ChannelTransport } from '../trpc/create-trpc-client';
import type { ChannelAddress, OpenSocket } from './byte-socket';
import { channelFetch } from './channel-fetch';
import { channelWebSocket } from './channel-web-socket';
import {
  type ChannelInput,
  openChannel,
  type OpenedChannel,
} from './open-channel';
import type { Keypair } from './x25519';

/*
 * What differs between a phone and a test: where sockets and randomness come from, and where this Device's key is kept. Everything above it (the handshake, the framing, the tRPC link) is the code the App ships.
 */
export interface ChannelPlatform {
  readonly openSocket: OpenSocket;
  readonly randomBytes: (length: number) => Uint8Array;
  // This Device's own long-term key, read from platform secure storage (ADR-0045).
  readonly deviceKey: () => Promise<Keypair>;
  // What the Device says of itself in the handshake. The Pairing Ticket is not here: it belongs to the one Connection that spends it (`ChannelTarget`).
  readonly claim: () => DeviceClaim;
}

export type DeviceClaim = Omit<PairingClaim, 'ticket'>;

// A paired Server as the App holds it: the address to knock on, and the static key it must answer with.
export interface ChannelTarget {
  readonly address: ChannelAddress;
  readonly serverPublicKey: string;
  // The Pairing Ticket the QR carried, for the one Connection that pairs; every Connection after it is the Device Key alone.
  readonly ticket?: string;
}

/*
 * Opens a channel to the target. The Device Key is read once, whatever opens first: two channels opening together would otherwise each find none kept and each make a key, and only the last one written would be this Device's.
 */
export const opener = (
  target: ChannelTarget,
  platform: ChannelPlatform,
): (() => Promise<OpenedChannel>) => {
  const deviceKey = once(platform.deviceKey);

  return async () =>
    openChannel(
      inputOf(target, platform, await deviceKey()),
      platform.openSocket,
    );
};

const inputOf = (
  target: ChannelTarget,
  platform: ChannelPlatform,
  deviceKey: Keypair,
): ChannelInput => ({
  address: target.address,
  serverPublicKey: target.serverPublicKey,
  deviceKey,
  claim: { ...platform.claim(), ticket: target.ticket },
  randomBytes: platform.randomBytes,
});

// A failed read is not kept, so a Device that could not reach secure storage once can try again.
function once<T>(read: () => Promise<T>): () => Promise<T> {
  let reading: Promise<T> | undefined;

  return () => {
    reading ??= read().catch((cause: unknown) => {
      reading = undefined;
      throw cause;
    });

    return reading;
  };
}

/*
 * Everything the App sends a paired Server travels through here: tRPC's socket and fetch both open the channel, run the handshake with the Device Key, and carry their bytes inside it (ADR-0045).
 */
export function createChannelTransport(
  target: ChannelTarget,
  platform: ChannelPlatform,
  onRefused?: () => void,
): ChannelTransport {
  const open = opener(target, platform);

  return {
    WebSocket: channelWebSocket({
      openChannel: open,
      randomBytes: platform.randomBytes,
      onRefused,
    }),
    fetch: channelFetch({ openChannel: open }),
  };
}
