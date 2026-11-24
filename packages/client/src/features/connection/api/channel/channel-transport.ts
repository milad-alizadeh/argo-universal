import type { PairingClaim } from '@repo/contracts';
import type { ChannelTransport } from '../trpc/create-trpc-client';
import type { ChannelAddress, OpenSocket } from './byte-socket';
import { channelFetch } from './channel-fetch';
import { ChannelRoute, type LocateServer } from './channel-route';
import { channelWebSocket } from './channel-web-socket';
import { mediaFetch } from './media-fetch';
import type { NativeChannel } from './native-channel';
import { nativeChannelWebSocket } from './native-channel-web-socket';
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
  // On iOS and Android, the native module that carries tRPC's socket once the handshake is done. Fetch, and the web, keep `openSocket`.
  readonly nativeChannel?: NativeChannel;
}

export type DeviceClaim = Omit<PairingClaim, 'ticket'>;

// A paired Server as the App holds it: the address Pairing kept, and the static key it must answer with.
export interface ChannelTarget {
  readonly address: ChannelAddress;
  // Where the Server announces itself now; asked whenever the address that answered last does not (ADR-0045).
  readonly locate?: LocateServer;
  readonly others?: readonly ChannelAddress[];
  readonly serverPublicKey: string;
  // The Pairing Ticket the QR carried, for the one Connection that pairs; every Connection after it is the Device Key alone.
  readonly ticket?: string;
  // Called when the Server says the request is with the owner, before the owner has answered.
  readonly onAsked?: () => void;
}

/*
 * Opens a channel to the target, on whichever address of it answers (`ChannelRoute`). The Device Key is read once, whatever opens first: two channels opening together would otherwise each find none kept and each make a key, and only the last one written would be this Device's.
 */
export const opener = (
  target: ChannelTarget,
  platform: ChannelPlatform,
  shared: SharedOpening = sharedOpening(target, platform),
): (() => Promise<OpenedChannel>) => {
  return async () =>
    shared.route.open(
      at(target, platform, await shared.deviceKey()),
      (opened) => {
        opened.stream.close();
      },
    );
};

// What every channel to one Server shares, whichever socket carries it: where the Server answers, and the one read of the Device Key.
interface SharedOpening {
  readonly route: ChannelRoute;
  readonly deviceKey: () => Promise<Keypair>;
}

const sharedOpening = (
  target: ChannelTarget,
  platform: ChannelPlatform,
): SharedOpening => ({
  route: new ChannelRoute(target.address, target.locate, target.others),
  deviceKey: once(platform.deviceKey),
});

// One try at one address the Server may answer on.
const at =
  (target: ChannelTarget, platform: ChannelPlatform, deviceKey: Keypair) =>
  async (address: ChannelAddress): Promise<OpenedChannel> =>
    openChannel(
      inputOf({ ...target, address }, platform, deviceKey),
      platform.openSocket,
    );

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
  onAsked: target.onAsked,
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
  const shared = sharedOpening(target, platform);
  const open = opener(target, platform, shared);
  const { nativeChannel } = platform;

  const fetch = channelFetch({
    openChannel: open,
    randomBytes: platform.randomBytes,
  });

  const socketDeps = {
    openChannel: open,
    randomBytes: platform.randomBytes,
    onRefused,
  };

  return {
    WebSocket: nativeChannel
      ? nativeChannelWebSocket({
          ...socketDeps,
          openChannel: opener(
            target,
            { ...platform, openSocket: nativeChannel.openSocket },
            shared,
          ),
          native: nativeChannel,
        })
      : channelWebSocket(socketDeps),
    fetch,
    media: mediaFetch({
      openChannel: open,
      randomBytes: platform.randomBytes,
      fallback: fetch,
    }),
  };
}
