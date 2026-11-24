import type { OpenSocket } from '../src/features/connection/api/channel/byte-socket';
import {
  createChannelTransport,
  opener,
} from '../src/features/connection/api/channel/channel-transport';
import { mediaFetch } from '../src/features/connection/api/channel/media-fetch';
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
  // The same reader with its own window: how many reads are on the way on its one channel.
  mediaWindow: (window: number) => typeof fetch;
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

  const target = { address: { host: address, port }, serverPublicKey };

  const slowPlatform = {
    ...platform,
    openSocket: network ? slowNetwork(counting, network) : counting,
  };

  const transport = createChannelTransport(target, slowPlatform);

  const trpc = createTRPCClient(channelServerUrl, undefined, {
    channel: transport,
  });

  return {
    client: trpc.client,
    media: transport.media,
    mediaWindow: (window) =>
      mediaFetch({
        openChannel: opener(target, slowPlatform),
        randomBytes: platform.randomBytes,
        fallback: transport.fetch,
        window,
      }),
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

// How a Feed opens for an App that holds nothing of the Session: a `feed.page` read and then a subscription that brings the snapshot (before), or one subscription that opens with the tail and the snapshot.
export type ColdOpen = 'page-then-subscribe' | 'subscription-only';

export async function coldOpenMs(
  phone: Phone,
  sessionId: string,
  how: ColdOpen,
): Promise<{ ms: number; rows: number }> {
  const started = performance.now();
  const rows = Promise.withResolvers<number>();
  const snapshot = Promise.withResolvers<void>();

  const page =
    how === 'page-then-subscribe'
      ? await phone.client.feed.page.query({ sessionId, direction: 'tail' })
      : undefined;

  const subscription = phone.client.feed.subscribe.subscribe(
    { sessionId, after: null, tail: page === undefined },
    {
      onData: (received) => {
        const event = 'type' in received ? received : received.data;

        if (event.type === 'tail') rows.resolve(event.page.rows.length);

        if (event.type === 'snapshot') snapshot.resolve();
      },
      onError: snapshot.reject,
    },
  );

  const count = page ? page.rows.length : await rows.promise;

  await snapshot.promise;
  subscription.unsubscribe();

  return { ms: performance.now() - started, rows: count };
}
