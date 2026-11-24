import { blobPath, ClockTick } from '@repo/contracts';
import { startEngineTestHost } from '@repo/engine/mocks';
import {
  emptySessionInput,
  startAcpEngine,
} from '@repo/engine/mocks/acp-engine';
import { waitForAcpSessionIdle } from '@repo/engine/mocks/acp-feed';
import { afterEach, expect, it, vi } from 'vitest';
import {
  endpointOf,
  nodeChannelPlatform,
  openAs,
  pairedNodeDevice,
} from '../../../../../mocks/node-channel-platform';
import { channelServerUrl, createTRPCClient } from '../trpc/create-trpc-client';
import type { ByteSocket } from './byte-socket';
import {
  createChannelTransport,
  type ChannelPlatform,
} from './channel-transport';
import { PairingRefused } from './open-channel';

const closers: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const close of closers.splice(0)) await close();
});

type Host = Pick<
  Awaited<ReturnType<typeof startEngineTestHost>>,
  'url' | 'caller' | 'pairing'
>;

async function clientTo(host: Host): Promise<{
  client: ReturnType<typeof createTRPCClient>['client'];
  transport: ReturnType<typeof createChannelTransport>;
}> {
  const platform = nodeChannelPlatform(await pairedNodeDevice(host));
  const { host: address, port, serverPublicKey } = await endpointOf(host);

  const transport = createChannelTransport(
    { address: { host: address, port }, serverPublicKey },
    platform,
  );

  const trpc = createTRPCClient(channelServerUrl, undefined, {
    channel: transport,
  });

  closers.push(trpc.close);

  return { client: trpc.client, transport };
}

it('reads the Server through the channel after a Pairing Ticket made this Device a row', async () => {
  const host = await startEngineTestHost();
  const { client } = await clientTo(host);

  expect(await client.system.info.query()).toMatchObject({ version: '1.2.3' });
  expect(await host.caller.devices.list()).toEqual([
    expect.objectContaining({ serverDevice: true }),
    expect.objectContaining({
      name: 'Test phone',
      platform: 'android',
      serverDevice: false,
    }),
  ]);
});

it('carries a subscription inside the channel', async () => {
  const { client } = await clientTo(await startEngineTestHost());

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

it('reads a Session and its Feed through the channel', async () => {
  const host = await startAcpEngine();

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'From the Server Device' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);
  const { client } = await clientTo(host);

  expect(await client.session.get.query(created)).toMatchObject({
    title: 'From the Server Device',
  });

  const { rows } = await client.feed.page.query({
    ...created,
    direction: 'tail',
  });

  expect(rows.map(({ sessionUpdate }) => sessionUpdate)).toContain(
    'user_message',
  );
});

it('uploads a file and reads the Blob back inside the channel, with no URL', async () => {
  const { client, transport } = await clientTo(await startEngineTestHost());
  const form = new FormData();
  form.set('file', new Blob(['png'], { type: 'image/png' }), 'image.png');

  const stored = await client.blob.upload.mutate(form);
  const response = await transport.fetch(blobPath(stored.blobId));

  expect(response.status).toBe(200);
  expect(await response.text()).toBe('png');
});

it('tells a Device with no Pairing Ticket and no row that it needs one', async () => {
  const host = await startEngineTestHost();

  await expect(openAs(host, nodeChannelPlatform())).rejects.toBeInstanceOf(
    PairingRefused,
  );
  expect(await host.caller.devices.list()).toHaveLength(1);
});

it('gives nothing to an App holding a Server key that is not the Server answering', async () => {
  const host = await startEngineTestHost();
  const impostor = await startEngineTestHost();
  const ticket = host.pairing.mint().ticket;
  const platform = nodeChannelPlatform();

  await expect(
    openAs(host, platform, { serverHost: impostor, ticket }),
  ).rejects.toBeDefined();
  expect(await host.caller.devices.list()).toHaveLength(1);
});

it('names the reason when the Pairing Ticket was already spent', async () => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();
  (await openAs(host, nodeChannelPlatform(), { ticket })).stream.close();

  // A second Device, with a key of its own, brings the same code.
  await expect(openAs(host, nodeChannelPlatform(), { ticket })).rejects.toEqual(
    new PairingRefused('ticket-spent'),
  );
});

const nobody = (): void => {};

// Wraps the platform so the first socket it opens can be made to swallow everything in both directions without closing, as one does after a Wi-Fi change.
interface Silenceable {
  platform: ChannelPlatform;
  sockets: ByteSocket[];
  silence: () => void;
}

function silenceable(platform: ChannelPlatform): Silenceable {
  const sockets: ByteSocket[] = [];
  let silent = false;

  const openSocket: ChannelPlatform['openSocket'] = async (to) => {
    const socket = await platform.openSocket(to);
    const first = sockets.length === 0;
    const heard = (): boolean => !(first && silent);
    const write = socket.write.bind(socket);
    const received = new Map<'to', ByteSocket['onData']>();

    sockets.push(socket);

    socket.write = (data): void => {
      if (heard()) write(data);
    };

    Object.defineProperty(socket, 'onData', {
      get: (): ByteSocket['onData'] => (chunk) => {
        if (heard()) (received.get('to') ?? nobody)(chunk);
      },
      set: (next: ByteSocket['onData']): void => {
        received.set('to', next);
      },
    });

    return socket;
  };

  return {
    platform: { ...platform, openSocket },
    sockets,
    silence: (): void => {
      silent = true;
    },
  };
}

it('reconnects when the Connection goes silent without closing', async () => {
  const host = await startEngineTestHost();
  const quiet = silenceable(nodeChannelPlatform(await pairedNodeDevice(host)));
  const { host: address, port, serverPublicKey } = await endpointOf(host);

  const transport = createChannelTransport(
    { address: { host: address, port }, serverPublicKey },
    quiet.platform,
  );

  const trpc = createTRPCClient(channelServerUrl, undefined, {
    channel: transport,
    keepAlive: { intervalMs: 50, pongTimeoutMs: 50 },
  });

  closers.push(trpc.close);

  await trpc.client.system.info.query();
  quiet.silence();

  await vi.waitFor(() => expect(quiet.sockets).toHaveLength(2), {
    timeout: 5000,
  });
  expect(await trpc.client.system.info.query()).toMatchObject({
    version: '1.2.3',
  });
});
