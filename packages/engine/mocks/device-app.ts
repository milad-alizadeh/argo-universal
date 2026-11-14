import {
  createTRPCClient,
  createWSClient,
  wsLink,
  type TRPCClient,
} from '@trpc/client';
import WebSocket from 'ws';
import type { AppRouter } from '../src/engine/router';
import type { ChannelSocket } from '../src/pairing/channel-socket';
import {
  connectChannel,
  type ChannelInput,
} from '../src/pairing/connect-channel';
import type { TestDevice } from './engine-channel';

export type DeviceApp = TestDevice & { close: () => void };

export async function keepDeviceApp(device: TestDevice): Promise<DeviceApp> {
  return { ...device, ...(await channelApp(device.channel)) };
}

type DeviceConnection = { caller: TRPCClient<AppRouter>; close: () => void };

// Unlike a handshake-per-request probe, an App keeps its authenticated Connection while it edits or subscribes.
async function channelApp(input: ChannelInput): Promise<DeviceConnection> {
  const { socket } = await connectChannel(input);

  const client = createWSClient({
    url: `ws://${input.address.host}:${input.address.port}`,
    WebSocket: socketOnChannel(socket),
  });

  return {
    caller: createTRPCClient<AppRouter>({ links: [wsLink({ client })] }),
    close: () => closeChannel(client, socket),
  };
}

function socketOnChannel(socket: ChannelSocket): typeof globalThis.WebSocket {
  return new Proxy(globalThis.WebSocket, {
    // ChannelSocket is the plaintext Duplex the shipped channel hands to HTTP and WebSocket implementations.
    construct: (_constructor, [url]) =>
      Reflect.construct(WebSocket, [url, { createConnection: () => socket }]),
  });
}

function closeChannel(
  client: ReturnType<typeof createWSClient>,
  socket: ChannelSocket,
): void {
  void client.close();
  socket.destroy();
}
