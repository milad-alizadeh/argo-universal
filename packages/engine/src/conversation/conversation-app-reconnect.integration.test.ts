import { randomBytes } from 'node:crypto';
import {
  createTRPCClient,
  createWSClient,
  wsLink,
  type TRPCClient,
} from '@trpc/client';
import { expect, it, onTestFinished } from 'vitest';
import { AppPageSocket } from '#mocks/app-socket';
import { offer } from '#mocks/conversation-engine';
import { pause } from '#mocks/conversation-timing';
import {
  startConversationWork,
  type ConversationWork,
} from '#mocks/conversation-work';
import type { AppRouter } from '../engine/router';
import { appReconnectGraceMs } from './conversation-watchers';

type App = {
  appInstance: string;
  client: TRPCClient<AppRouter>;
  socket: ReturnType<typeof createWSClient>;
};

function appOf(
  work: ConversationWork,
  appInstance = randomBytes(16).toString('hex'),
): App {
  const socket = createWSClient({
    WebSocket: AppPageSocket,
    url: work.host.url.replace(/^http/, 'ws'),
    connectionParams: { appInstance },
  });

  onTestFinished(() => socket.close());

  const client = createTRPCClient<AppRouter>({
    links: [wsLink({ client: socket })],
  });

  return { appInstance, client, socket };
}

async function startOnApp(work: ConversationWork, app: App): Promise<string> {
  const started = await app.client.conversation.start.mutate({
    sessionId: work.sessionId,
    offer,
  });

  work.provider.call.connect();

  return started.conversationId;
}

it(
  'keeps the same Conversation past the original deadline when its App reconnects',
  async () => {
    const work = await startConversationWork([]);
    const app = appOf(work);
    const conversationId = await startOnApp(work, app);
    const watching = Promise.withResolvers<void>();
    const reattached = Promise.withResolvers<void>();
    const original = app.socket.connection?.ws;
    expect(original).toBeDefined();

    const subscription = app.client.conversation.updates.subscribe(undefined, {
      onData: ({ conversation }) => {
        if (conversation?.conversationId !== conversationId) return;

        if (app.socket.connection?.ws === original) watching.resolve();
        else reattached.resolve();
      },
      onError: (error) => {
        watching.reject(error);
        reattached.reject(error);
      },
    });

    onTestFinished(() => subscription.unsubscribe());

    await Promise.race([watching.promise, reattached.promise]);
    original?.close();
    await reattached.promise;
    expect(app.socket.connection?.ws).not.toBe(original);
    await pause(appReconnectGraceMs);
    expect(await work.host.caller.conversation.status()).toMatchObject({
      conversation: { conversationId },
      ended: null,
    });
  },
  appReconnectGraceMs + 5000,
);

it(
  'ends after the grace period when only a different App instance connects',
  async () => {
    const work = await startConversationWork([]);
    const app = appOf(work);
    const conversationId = await startOnApp(work, app);
    await app.socket.close();
    const different = appOf(work);
    const watched = Promise.withResolvers<void>();

    const subscription = different.client.conversation.watch.subscribe(
      undefined,
      {
        onData: () => watched.resolve(),
        onError: watched.reject,
      },
    );

    onTestFinished(() => subscription.unsubscribe());
    await watched.promise;
    expect(await work.host.caller.conversation.status()).toMatchObject({
      conversation: { conversationId },
    });

    await expect
      .poll(() => work.host.caller.conversation.status(), {
        timeout: appReconnectGraceMs + 2000,
      })
      .toMatchObject({
        conversation: null,
        ended: { reason: 'app-disconnected' },
      });
    const returning = appOf(work, app.appInstance);
    const ended = Promise.withResolvers<unknown>();

    const returned = returning.client.conversation.watch.subscribe(undefined, {
      onData: ended.resolve,
      onError: ended.reject,
    });

    onTestFinished(() => returned.unsubscribe());
    expect(await ended.promise).toMatchObject({
      conversation: null,
      ended: { conversationId, reason: 'app-disconnected' },
    });
    await expect.poll(work.feed).toContainEqual(
      expect.objectContaining({
        title: 'Conversation ended: the App disconnected',
      }),
    );
  },
  appReconnectGraceMs + 5000,
);

it('honors an explicit hang-up while waiting for the App', async () => {
  const work = await startConversationWork([]);
  const app = appOf(work);
  const conversationId = await startOnApp(work, app);

  await app.socket.close();
  expect(
    await work.host.caller.conversation.hangUp({ sessionId: work.sessionId }),
  ).toEqual({
    ended: true,
  });
  expect(await work.host.caller.conversation.status()).toMatchObject({
    conversation: null,
    ended: { conversationId, reason: 'agent' },
  });
});
