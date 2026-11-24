import { openAcpFeedSession } from '@repo/engine/mocks/acp-feed';
import { afterEach, expect, it } from 'vitest';
import { badWifi, slowNetwork } from '../../../../../mocks/slow-network';
import {
  endpointOf,
  nodeChannelPlatform,
  pairedNodeDevice,
} from '../../../../../mocks/node-channel-platform';
import { channelServerUrl, createTRPCClient } from '../trpc/create-trpc-client';
import { createChannelTransport } from './channel-transport';

const closers: (() => void)[] = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
});

const messageCount = 60;
const paragraph = 'A line of an Agent reply, long enough to cost bytes. '.repeat(
  40,
);

const seeded = Array.from({ length: messageCount }, (_, index) => ({
  sessionUpdate: 'agent_message_chunk' as const,
  messageId: `message-${index}`,
  content: { type: 'text' as const, text: `${index}: ${paragraph}` },
}));

type Host = Awaited<ReturnType<typeof openAcpFeedSession>>['host'];

// The App as a phone on this network: a paired Device whose every byte crosses the profile.
async function phoneOn(
  host: Host,
  network: Parameters<typeof slowNetwork>[1] | undefined,
): Promise<ReturnType<typeof createTRPCClient>['client']> {
  const device = await pairedNodeDevice(host);
  const platform = nodeChannelPlatform(device);
  const { host: address, port, serverPublicKey } = await endpointOf(host);

  const transport = createChannelTransport(
    { address: { host: address, port }, serverPublicKey },
    network
      ? {
          ...platform,
          openSocket: slowNetwork(platform.openSocket, network),
        }
      : platform,
  );

  const trpc = createTRPCClient(channelServerUrl, undefined, {
    channel: transport,
  });

  closers.push(trpc.close);

  return trpc.client;
}

async function firstPageMs(
  host: Host,
  sessionId: string,
  network?: Parameters<typeof slowNetwork>[1],
): Promise<number> {
  const client = await phoneOn(host, network);
  const started = performance.now();

  const page = await client.feed.page.query({ sessionId, direction: 'tail' });

  const elapsed = performance.now() - started;

  expect(page.rows.length).toBeGreaterThan(20);

  return elapsed;
}

/*
 * The baseline a transport change is measured against: how long a phone waits for the first page of a Feed on bad Wi-Fi, from a new channel (handshake included) to the rows. Run it with `pnpm --filter client exec vitest run channel-slow-network` and read the line it prints.
 */
it('records how long the first page takes over bad Wi-Fi', async () => {
  const { host, sessionId } = await openAcpFeedSession(seeded);

  const direct = await firstPageMs(host, sessionId);
  const slow = await firstPageMs(host, sessionId, badWifi);

  console.info(
    `first page of ${messageCount} seeded messages: ${Math.round(direct)} ms direct, ${Math.round(slow)} ms over bad Wi-Fi`,
  );

  // The handshake and the request each cross the link both ways, so bad Wi-Fi costs at least a few round trips of latency over the direct time.
  expect(slow).toBeGreaterThan(direct + 3 * 2 * 60);
  expect(slow).toBeLessThan(30_000);
});
