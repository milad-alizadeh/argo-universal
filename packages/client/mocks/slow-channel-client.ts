import type { OpenSocket } from '../src/features/connection/api/channel/byte-socket';
import { createChannelTransport } from '../src/features/connection/api/channel/channel-transport';
import {
  channelServerUrl,
  createTRPCClient,
} from '../src/features/connection/api/trpc/create-trpc-client';
import {
  endpointOf,
  nodeChannelPlatform,
  pairedNodeDevice,
  type PairableHost,
} from './node-channel-platform';
import { slowNetwork, type NetworkProfile } from './slow-network';

export interface Phone {
  client: ReturnType<typeof createTRPCClient>['client'];
  // How a Blob or Plugin asset is read, and how the App read one before media shared a channel.
  media: typeof fetch;
  fetch: typeof fetch;
  // How many sockets, and so Noise handshakes, the phone has opened so far.
  handshakes: () => number;
  close: () => Promise<void> | void;
}

/*
 * The App as a phone on a network: a paired Device whose every byte crosses `network`, or goes straight to the Server when none is given.
 */
export async function phoneOn(
  host: PairableHost,
  network?: NetworkProfile,
): Promise<Phone> {
  const platform = nodeChannelPlatform(await pairedNodeDevice(host));
  const { host: address, port, serverPublicKey } = await endpointOf(host);
  let opened = 0;

  const counting: OpenSocket = async (to, headers) => {
    opened += 1;

    return platform.openSocket(to, headers);
  };

  const transport = createChannelTransport(
    { address: { host: address, port }, serverPublicKey },
    {
      ...platform,
      openSocket: network ? slowNetwork(counting, network) : counting,
    },
  );

  const trpc = createTRPCClient(channelServerUrl, undefined, {
    channel: transport,
  });

  return {
    client: trpc.client,
    media: transport.media,
    fetch: transport.fetch,
    handshakes: () => opened,
    close: trpc.close,
  };
}

// How long the first page of a Session's Feed takes from a channel that is not open yet: handshake, request and rows.
export async function firstPageMs(
  phone: Phone,
  sessionId: string,
): Promise<{ ms: number; rows: number }> {
  const started = performance.now();

  const page = await phone.client.feed.page.query({
    sessionId,
    direction: 'tail',
  });

  return { ms: performance.now() - started, rows: page.rows.length };
}
