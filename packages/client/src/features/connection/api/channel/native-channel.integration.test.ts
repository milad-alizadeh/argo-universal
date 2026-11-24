import { ClockTick } from '@repo/contracts';
import { startEngineTestHost } from '@repo/engine/mocks';
import { openAcpFeedSession } from '@repo/engine/mocks/acp-feed';
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
import { phoneOn } from '../../../../../mocks/slow-channel-client';
import { openConnection } from '../open-connection';
import { channelServerUrl, createTRPCClient } from '../trpc/create-trpc-client';
import { createChannelTransport } from './channel-transport';

const notAllowedState = 'not-allowed';

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

const paragraph =
  'A line of an Agent reply, long enough to cost bytes. '.repeat(40);

const seededFeed = Array.from({ length: 60 }, (_, index) => ({
  sessionUpdate: 'agent_message_chunk' as const,
  messageId: `message-${index}`,
  content: { type: 'text' as const, text: `${index}: ${paragraph}` },
}));

it('reads a large Feed page through the module at a fraction of its size', async () => {
  const { host, sessionId } = await openAcpFeedSession(seededFeed);
  const { client, native } = await nativeClientTo(host);

  const page = await client.feed.page.query({ sessionId, direction: 'tail' });
  const message = native.messages.find((m) => m.includes('message-59'));

  expect(page.rows.length).toBeGreaterThan(20);
  expect(message?.length).toBeGreaterThan(90_000);
  expect(native.wireBytesAfterHandOver()).toBeLessThan(
    (message?.length ?? 0) / 10,
  );
});

it('still reads the same page through a carrier that did not offer compression', async () => {
  const { host, sessionId } = await openAcpFeedSession(seededFeed);
  const phone = await phoneOn(host);

  closers.push(phone.close);

  const page = await phone.client.feed.page.query({
    sessionId,
    direction: 'tail',
  });

  expect(page.rows.length).toBeGreaterThan(20);
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

// These run the Server, the handshake and tRPC for real and the JavaScript side of the module's contract. The module itself is `NodeNativeModule`, which reuses the JavaScript framing after the hand-over, so what the Swift and Kotlin record paths do is tested in their own tests (`modules/argo-channel`).
async function connectedThroughTheModule(): Promise<{
  host: Awaited<ReturnType<typeof startEngineTestHost>>;
  opened: ReturnType<typeof openConnection>;
}> {
  const host = await startEngineTestHost({ version: '1.2.3' });
  const platform = nodeChannelPlatform(await pairedNodeDevice(host));
  const { channel, module } = nodeNativeChannel(platform.openSocket);

  const opened = openConnection(await endpointOf(host), {
    ...platform,
    nativeChannel: channel,
  });

  closers.push(opened.close, () => module.closeAll());
  await vi.waitFor(() => expect(opened.connection.state()).toBe('open'), {
    timeout: 5000,
  });

  return { host, opened };
}

const notAllowed = (connection: { state: () => string }): Promise<void> =>
  vi.waitFor(() => expect(connection.state()).toBe(notAllowedState), {
    timeout: 5000,
  });

it('says Not allowed when the Server does not know this Device, through the module', async () => {
  const host = await startEngineTestHost();
  const platform = nodeChannelPlatform();
  const { channel, module } = nodeNativeChannel(platform.openSocket);

  const opened = openConnection(await endpointOf(host), {
    ...platform,
    nativeChannel: channel,
  });

  closers.push(opened.close, () => module.closeAll());
  await notAllowed(opened.connection);
  expect(opened.connection.state()).toBe(notAllowedState);
});

it('says Not allowed once the owner unpairs the Device, through the module', async () => {
  const { host, opened } = await connectedThroughTheModule();
  const [, device] = await host.caller.devices.list();

  await host.caller.devices.unpair({ deviceId: device?.id ?? '' });

  await notAllowed(opened.connection);
  expect(opened.connection.state()).toBe(notAllowedState);
});
