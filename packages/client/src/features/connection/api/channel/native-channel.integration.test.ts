import { ClockTick } from '@repo/contracts';
import { startEngineTestHost } from '@repo/engine/mocks';
import { afterEach, expect, it, vi } from 'vitest';
import {
  endpointOf,
  nodeChannelPlatform,
  pairedNodeDevice,
  type PairableHost,
} from '../../../../../mocks/node-channel-platform';
import {
  nodeNativeChannel,
  type NodeNativeModule,
} from '../../../../../mocks/node-native-channel';
import { channelServerUrl, createTRPCClient } from '../trpc/create-trpc-client';
import { createChannelTransport } from './channel-transport';

const closers: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const close of closers.splice(0)) await close();
});

async function nativeClientTo(host: PairableHost): Promise<{
  client: ReturnType<typeof createTRPCClient>['client'];
  native: NodeNativeModule;
}> {
  const platform = nodeChannelPlatform(await pairedNodeDevice(host));
  const { channel, module: native } = nodeNativeChannel(platform.openSocket);
  const { host: address, port, serverPublicKey } = await endpointOf(host);

  const transport = createChannelTransport(
    { address: { host: address, port }, serverPublicKey },
    { ...platform, nativeChannel: channel },
  );

  const trpc = createTRPCClient(channelServerUrl, undefined, {
    channel: transport,
  });

  closers.push(trpc.close, () => native.closeAll());

  return { client: trpc.client, native };
}

it('reads the Server through the native module, one message string at a time', async () => {
  const { client, native } = await nativeClientTo(await startEngineTestHost());

  expect(await client.system.info.query()).toMatchObject({ version: '1.2.3' });
  expect(native.messages.some((message) => message.includes('1.2.3'))).toBe(
    true,
  );
  expect(native.bytesAfterHandOver()).toBe(0);
});

it('carries a subscription through the native module', async () => {
  const { client } = await nativeClientTo(await startEngineTestHost());

  const ticks = await new Promise<unknown[]>((resolve, reject) => {
    const received: unknown[] = [];

    const subscription = client.system.clock.subscribe(undefined, {
      onData: (tick) => {
        received.push(tick);

        if (received.length === 2) {
          subscription.unsubscribe();
          resolve(received);
        }
      },
      onError: reject,
    });
  });

  for (const tick of ticks)
    expect(ClockTick.safeParse(tick).success).toBe(true);
});

it('reconnects with a new handshake when the module reports the socket closed', async () => {
  const { client, native } = await nativeClientTo(await startEngineTestHost());

  await client.system.info.query();
  native.closeAll();

  await vi.waitFor(() => expect(native.opened()).toBe(2), { timeout: 5000 });
  expect(await client.system.info.query()).toMatchObject({ version: '1.2.3' });
});
