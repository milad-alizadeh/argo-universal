import { feedEventId } from '@repo/contracts';
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

// What the App sends the Server, read inside the channel: each `feed.subscribe` it opens, and the event id tRPC's client resumes it from.
interface Open {
  input: string | undefined;
  resumedFrom: string | undefined;
}

interface SentSubscription {
  method: string;
  params: {
    path: string;
    input: { lastEventId?: string };
    lastEventId?: string;
  };
}

const isFeedSubscription = (message: SentSubscription): boolean =>
  message.method === 'subscription' && message.params.path === 'feed.subscribe';

// The channel's WebSocket, which tRPC constructs, with every message it sends noted first.
function recording(socket: typeof WebSocket, opens: Open[]): typeof WebSocket {
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

function noteOpens(data: string, opens: Open[]): void {
  if (!data.startsWith('{') && !data.startsWith('[')) return;

  const sent: SentSubscription[] = [JSON.parse(data)].flat();

  for (const { params } of sent.filter(isFeedSubscription))
    opens.push({
      input: params.input.lastEventId,
      resumedFrom: params.lastEventId,
    });
}

it('sends one re-open of a Feed subscription after the last event id it received when the socket is lost', async () => {
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

  const opens: Open[] = [];

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

  const first = feedEventId({ epoch: page.epoch, revision: page.maxRevision });
  const ids: string[] = [];

  const subscription = trpc.client.feed.subscribe.subscribe(
    { sessionId: created.sessionId, after: null, lastEventId: first },
    {
      onData: (received) => {
        if ('id' in received) ids.push(received.id);
      },
    },
  );

  closers.push(() => subscription.unsubscribe());
  await vi.waitFor(() => expect(opens).toEqual([{ input: first }]));

  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Second' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  await vi.waitFor(() => expect(ids.at(-1)).not.toBe(first));

  const newest = ids.at(-1);

  quiet.silence();
  await vi.waitFor(() => expect(opens.length).toBeGreaterThan(1), {
    timeout: 10_000,
  });
  await new Promise((resolve) => setTimeout(resolve, 300));

  expect(opens.slice(1)).toEqual([{ input: first, resumedFrom: newest }]);
}, 30_000);
