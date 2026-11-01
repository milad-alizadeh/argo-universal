import type { PairingClaim } from '@repo/contracts';
import type { ChannelTransport } from '../trpc/create-trpc-client';
import type { ChannelAddress, OpenSocket } from './byte-socket';
import { channelFetch } from './channel-fetch';
import { channelWebSocket } from './channel-web-socket';
import { openChannel, type OpenedChannel } from './open-channel';
import type { Keypair } from './x25519';

/*
 * What differs between a phone and a test: where sockets and randomness come from, and where this Device's key is kept. Everything above it (the handshake, the framing, the tRPC link) is the code the App ships.
 */
export interface ChannelPlatform {
  readonly openSocket: OpenSocket;
  readonly randomBytes: (length: number) => Uint8Array;
  // This Device's own long-term key, read from platform secure storage (ADR-0045).
  readonly deviceKey: () => Promise<Keypair>;
  // What the Device says of itself in the handshake. A Pairing Ticket is in it only for the one Connection that spends it.
  readonly claim: () => PairingClaim;
}

// A paired Server as the App holds it: the address to knock on, and the static key it must answer with.
export interface ChannelTarget {
  readonly address: ChannelAddress;
  readonly serverPublicKey: string;
}

const opener =
  (target: ChannelTarget, platform: ChannelPlatform) =>
  async (): Promise<OpenedChannel> =>
    openChannel(
      {
        ...target,
        deviceKey: await platform.deviceKey(),
        claim: platform.claim(),
        randomBytes: platform.randomBytes,
      },
      platform.openSocket,
    );

/*
 * Everything the App sends a paired Server travels through here: tRPC's socket and fetch both open the channel, run the handshake with the Device Key, and carry their bytes inside it (ADR-0045).
 */
export function createChannelTransport(
  target: ChannelTarget,
  platform: ChannelPlatform,
): ChannelTransport {
  const open = opener(target, platform);

  return {
    WebSocket: channelWebSocket({
      openChannel: open,
      randomBytes: platform.randomBytes,
    }),
    fetch: channelFetch({ openChannel: open }),
  };
}
