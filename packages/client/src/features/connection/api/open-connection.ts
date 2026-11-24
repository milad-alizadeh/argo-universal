import { browseServers } from '../discovery/browse-servers';
import {
  announcedAddresses,
  type BrowseServers,
} from '../discovery/resolve-server';
import { type Connection, createConnection } from '../stores/connection';
import { appChannelPlatform } from './channel/channel-platform';
import {
  type ChannelPlatform,
  type ChannelTarget,
  createChannelTransport,
} from './channel/channel-transport';
import {
  isPaired,
  type PairedEndpoint,
  type ServerEndpoint,
} from './server-endpoint';
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

// Where the App finds Servers on the local network, and how; one place so a test can announce a Server of its own.
interface Network {
  platform: ChannelPlatform;
  browse: BrowseServers | null;
}

// The address Pairing kept is a fallback: the Server is looked for by its key whenever the address that answered last does not (ADR-0045).
function channelOf(
  endpoint: PairedEndpoint,
  network: Network,
  onRefused: () => void,
): ChannelTransport {
  const { host, port, serverPublicKey, others } = endpoint;

  const target: ChannelTarget = {
    address: { host, port },
    others,
    serverPublicKey,
    locate: async () => announcedAddresses(serverPublicKey, network.browse),
  };

  return createChannelTransport(target, network.platform, onRefused);
}

interface Wiring {
  url: string;
  channel: ChannelTransport | undefined;
}

const wiredTo = (
  endpoint: ServerEndpoint,
  network: Network,
  connection: Connection,
): Wiring =>
  isPaired(endpoint)
    ? {
        url: channelServerUrl,
        channel: channelOf(endpoint, network, connection.refuse),
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
export const openConnection = (
  endpoint: ServerEndpoint,
  platform: ChannelPlatform = appChannelPlatform,
  browse: BrowseServers | null = browseServers,
): OpenConnection => openOver(endpoint, { platform, browse });

function openOver(endpoint: ServerEndpoint, network: Network): OpenConnection {
  const connection = createConnection();
  const { url, channel } = wiredTo(endpoint, network, connection);

  const trpc = createTRPCClient(url, connection.nextAttempt, { channel });

  connection.watch(trpc.webSocketClient.connectionState);

  return {
    client: trpc.client,
    connection,
    fetch: channel?.media,
    close: closing(connection, trpc),
  };
}
