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

  const transport = createChannelTransport(
    { address: { host: address, port }, serverPublicKey },
    network
      ? { ...platform, openSocket: slowNetwork(platform.openSocket, network) }
      : platform,
  );

  const trpc = createTRPCClient(channelServerUrl, undefined, {
    channel: transport,
  });

  return { client: trpc.client, close: trpc.close };
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
