import type { FeedSubscribeOutput, FeedSyncPoint } from '@repo/contracts';
import {
  emptySessionInput,
  startAcpEngine,
} from '@repo/engine/mocks/acp-engine';
import { waitForAcpSessionIdle } from '@repo/engine/mocks/acp-feed';
import { afterEach, expect, it, vi } from 'vitest';
import {
  endpointOf,
  nodeChannelPlatform,
  pairedNodeDevice,
  silenceable,
} from '../../../../mocks/node-channel-platform';
import { createChannelTransport } from './channel/channel-transport';
import { channelServerUrl, createTRPCClient } from './trpc/create-trpc-client';

const closers: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const close of closers.splice(0)) await close();
});

// What the App sends the Server, read inside the channel: the `after` of each `feed.subscribe` it opens.
interface Opens {
  afters: (FeedSyncPoint | null)[];
}

const isSubscribe = (
  message: unknown,
): message is {
  method: string;
  params: { path: string; input: { after: FeedSyncPoint | null } };
} =>
  typeof message === 'object' &&
  message !== null &&
  'method' in message &&
  'params' in message;

// The channel's WebSocket, which tRPC constructs, with every message it sends noted first.
function recording(socket: typeof WebSocket, opens: Opens): typeof WebSocket {
  return new Proxy(socket, {
    construct: (target, args: [string]) => {
      const opened = new target(...args);
      const send = opened.send.bind(opened);

      opened.send = (data: string): void => {
        noteOpens(data, opens);
        send(data);
      };

      return opened;
    },
  });
}

function noteOpens(data: string, opens: Opens): void {
  if (!data.startsWith('{') && !data.startsWith('[')) return;

  for (const message of [JSON.parse(data)].flat())
    if (
      isSubscribe(message) &&
      message.method === 'subscription' &&
      message.params.path === 'feed.subscribe'
    )
      opens.afters.push(message.params.input.after);
}

const newestOf = (events: readonly FeedSubscribeOutput[]): number =>
  Math.max(0, ...events.map((event) => ('rev' in event ? event.rev : 0)));

it('opens one Feed subscription after the revision held when the socket is lost, not the one the first open used', async () => {
  const host = await startAcpEngine();

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'First' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);

  const platform = nodeChannelPlatform(await pairedNodeDevice(host));
  const quiet = silenceable(platform.openSocket);
  const { host: address, port, serverPublicKey } = await endpointOf(host);

  const transport = createChannelTransport(
    { address: { host: address, port }, serverPublicKey },
    { ...platform, openSocket: quiet.openSocket },
  );

  const opens: Opens = { afters: [] };

  const trpc = createTRPCClient(channelServerUrl, undefined, {
    channel: {
      ...transport,
      WebSocket: recording(transport.WebSocket, opens),
    },
    keepAlive: { intervalMs: 100, pongTimeoutMs: 1000 },
  });

  closers.push(trpc.close, quiet.close);

  const page = await trpc.client.feed.page.query({
    sessionId: created.sessionId,
    direction: 'tail',
  });

  const first = { epoch: page.epoch, revision: page.maxRevision };
  // What the cache holds: where the screen's own resume reopens, as the hook does when the subscription fails.
  let held = first;

  const follow = (after: FeedSyncPoint): void => {
    const subscription = trpc.client.feed.subscribe.subscribe(
      { sessionId: created.sessionId, after },
      {
        onData: (event) => {
          held = {
            ...held,
            revision: Math.max(held.revision, newestOf([event])),
          };
        },
        onError: () => follow(held),
      },
    );

    closers.push(() => subscription.unsubscribe());
  };

  follow(first);
  await vi.waitFor(() => expect(opens.afters).toEqual([first]));

  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Second' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  await vi.waitFor(() => expect(held.revision).toBeGreaterThan(first.revision));

  quiet.silence();
  await vi.waitFor(
    () => expect(quiet.sockets.length).toBeGreaterThanOrEqual(2),
    {
      timeout: 5000,
    },
  );
  await vi.waitFor(() => expect(opens.afters.length).toBeGreaterThan(1));
  await new Promise((resolve) => setTimeout(resolve, 300));

  expect(opens.afters.slice(1)).toEqual([held]);
}, 20_000);
