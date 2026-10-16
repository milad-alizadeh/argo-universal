import type { Page, WebSocketRoute } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { scrollToOldestHistoryMessage } from './feed-history-scroll';
import { Given, When, Then } from './fixtures';
import { reloadApp } from './frame';

// Request IDs restart on each WebSocket, so each one holds its own prefetches.
interface Socket {
  route: WebSocketRoute;
  prefetchIds: Set<number>;
  heldPrefetches: (() => void)[];
}

interface HeldRefresh {
  sockets: Socket[];
  armed: boolean;
  heldId?: number;
  delayPrefetch: boolean;
  release?: () => void;
}

const refreshes = new WeakMap<Page, HeldRefresh>();

const feedScroll = 'feed-scroll';

const PageRequest = z.object({
  id: z.number(),
  params: z.object({
    path: z.literal('feed.page'),
    input: z.object({ direction: z.enum(['tail', 'before']) }),
  }),
});

const Response = z.object({ id: z.number() });

function frames(message: string | Buffer): unknown[] {
  try {
    const value: unknown = JSON.parse(message.toString());

    return Array.isArray(value) ? value : [value];
  } catch {
    return [];
  }
}

function pageRequests(message: string | Buffer): z.infer<typeof PageRequest>[] {
  return frames(message).flatMap((frame) => {
    const request = PageRequest.safeParse(frame);

    return request.success ? [request.data] : [];
  });
}

function observePage(
  refresh: HeldRefresh,
  socket: Socket,
  request: z.infer<typeof PageRequest>,
): void {
  if (request.params.input.direction === 'before') {
    if (refresh.delayPrefetch) socket.prefetchIds.add(request.id);

    return;
  }

  observeTail(refresh, request.id);
}

function observeTail(refresh: HeldRefresh, id: number): void {
  if (refresh.armed) {
    refresh.heldId = id;
    refresh.armed = false;
  }
}

function responseIds(message: string | Buffer): number[] {
  return frames(message).flatMap((frame) => {
    const response = Response.safeParse(frame);

    return response.success ? [response.data.id] : [];
  });
}

function holdRefresh(
  refresh: HeldRefresh,
  { route, prefetchIds, heldPrefetches }: Socket,
  message: string | Buffer,
): void {
  const ids = responseIds(message);
  const send = (): void => route.send(message);

  if (ids.some((id) => prefetchIds.has(id))) heldPrefetches.push(send);
  else if (ids.some((id) => id === refresh.heldId)) refresh.release = send;
  else send();
}

function connect(route: WebSocketRoute, refresh: HeldRefresh): void {
  const server = route.connectToServer();
  const socket: Socket = { route, prefetchIds: new Set(), heldPrefetches: [] };
  refresh.sockets.push(socket);
  route.onMessage((message) => {
    for (const request of pageRequests(message))
      observePage(refresh, socket, request);
    server.send(message);
  });
  server.onMessage((message) => holdRefresh(refresh, socket, message));
}

Given('the Feed history refresh can be delayed', async ({ page }) => {
  const refresh: HeldRefresh = {
    sockets: [],
    armed: false,
    delayPrefetch: true,
  };

  refreshes.set(page, refresh);
  await page.routeWebSocket(/ws:\/\//, (route) => connect(route, refresh));
  await reloadApp(page);
});

When(
  'the initial history prefetch finishes at the newest message',
  async ({ page }) => {
    const refresh = refreshes.get(page);

    if (!refresh) throw new Error('The history transport was not prepared');

    // Earlier WebSockets closed with the reload; only the reopened Feed's prefetches count.
    const held = (): (() => void)[] =>
      refresh.sockets.at(-1)?.heldPrefetches ?? [];

    await expect.poll(() => held().length).toBeGreaterThan(0);
    await page.getByTestId(feedScroll).evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    refresh.delayPrefetch = false;

    for (const release of held().splice(0)) release();
    await expect(
      page.getByRole('progressbar', { name: 'Loading earlier' }),
    ).toHaveCount(0);
  },
);

When(
  'the Connection reconnects with its history refresh delayed',
  async ({ page }) => {
    const refresh = refreshes.get(page);

    if (!refresh) throw new Error('The history transport was not prepared');
    refresh.armed = true;
    refresh.delayPrefetch = false;
    const sockets = refresh.sockets;
    refresh.sockets = [];
    await Promise.all(sockets.map(({ route }) => route.close()));
    await expect
      .poll(() => refresh.sockets.length, { timeout: 15_000 })
      .toBeGreaterThan(0);
    await expect(page.getByText('Reconnecting…')).toHaveCount(0);
  },
);

When(
  'I scroll to the top while the history refresh is delayed',
  async ({ page }) => {
    await page.getByTestId(feedScroll).evaluate((element) => {
      element.scrollTop = 0;
    });
  },
);

Then(
  'the oldest history message loads before the refresh finishes',
  async ({ page }) => {
    try {
      await scrollToOldestHistoryMessage(page);
    } finally {
      refreshes.get(page)?.release?.();
    }
  },
);
