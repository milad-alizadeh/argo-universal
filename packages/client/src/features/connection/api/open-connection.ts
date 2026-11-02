import { type Connection, createConnection } from '../stores/connection';
import { appChannelPlatform } from './channel/channel-platform';
import {
  type ChannelPlatform,
  createChannelTransport,
} from './channel/channel-transport';
import { isPaired, type ServerEndpoint } from './server-endpoint';
import {
  channelServerUrl,
  createTRPCClient,
  type ChannelTransport,
  type ServerClient,
} from './trpc/create-trpc-client';

export interface OpenConnection {
  client: ServerClient['client'];
  connection: Connection;
  // Present for a paired Server: the way its Blobs and Plugin assets are read, inside the channel, since no URL names them.
  fetch?: ChannelTransport['fetch'];
  close: () => Promise<void>;
}

function channelOf(
  endpoint: ServerEndpoint,
  platform: ChannelPlatform,
  onRefused: () => void,
): ChannelTransport | undefined {
  if (!isPaired(endpoint)) return undefined;

  const { host, port, serverPublicKey } = endpoint;
  const target = { address: { host, port }, serverPublicKey };

  return createChannelTransport(target, platform, onRefused);
}

interface Wiring {
  url: string;
  channel: ChannelTransport | undefined;
}

const wiredTo = (
  endpoint: ServerEndpoint,
  platform: ChannelPlatform,
  connection: Connection,
): Wiring =>
  isPaired(endpoint)
    ? {
        url: channelServerUrl,
        channel: channelOf(endpoint, platform, connection.refuse),
      }
    : { url: endpoint.url, channel: undefined };

const closing =
  (connection: Connection, trpc: ServerClient) => async (): Promise<void> => {
    connection.stop();
    await trpc.close();
  };

/*
 * The App's Connection to a Server: a tRPC client whose socket opens only when the Connection allows each attempt. The Server on this Device is reached on its loopback WebSocket; a paired Server only inside the encrypted channel, with no plain-HTTP route left to fall back to (ADR-0045).
 */
export function openConnection(
  endpoint: ServerEndpoint,
  platform: ChannelPlatform = appChannelPlatform,
): OpenConnection {
  const connection = createConnection();
  const { url, channel } = wiredTo(endpoint, platform, connection);
  const trpc = createTRPCClient(url, connection.nextAttempt, { channel });

  connection.watch(trpc.webSocketClient.connectionState);

  return {
    client: trpc.client,
    connection,
    fetch: channel?.fetch,
    close: closing(connection, trpc),
  };
}
