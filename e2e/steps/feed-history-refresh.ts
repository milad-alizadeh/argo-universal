import type { Page, WebSocketRoute } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { scrollToOldestHistoryMessage } from './feed-history-scroll';
import { Given, When, Then } from './fixtures';
import { reloadApp } from './frame';

interface HeldRefresh {
  routes: WebSocketRoute[];
  armed: boolean;
  heldId?: number;
  delayPrefetch: boolean;
  prefetchIds: Set<number>;
  releasePrefetch?: () => void;
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
  request: z.infer<typeof PageRequest>,
): void {
  if (request.params.input.direction === 'before') {
    if (refresh.delayPrefetch) refresh.prefetchIds.add(request.id);

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
  route: WebSocketRoute,
  refresh: HeldRefresh,
  message: string | Buffer,
): void {
  const ids = responseIds(message);

  if (ids.some((id) => refresh.prefetchIds.has(id))) {
    refresh.releasePrefetch = (): void => route.send(message);

    return;
  }

  const isHeld = ids.some((id) => id === refresh.heldId);

  if (isHeld) refresh.release = (): void => route.send(message);
  else route.send(message);
}

function connect(route: WebSocketRoute, refresh: HeldRefresh): void {
  const server = route.connectToServer();
  refresh.routes.push(route);
  route.onMessage((message) => {
    for (const request of pageRequests(message)) observePage(refresh, request);
    server.send(message);
  });
  server.onMessage((message) => holdRefresh(route, refresh, message));
}

Given('the Feed history refresh can be delayed', async ({ page }) => {
  const refresh: HeldRefresh = {
    routes: [],
    armed: false,
    delayPrefetch: true,
    prefetchIds: new Set(),
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
    await expect.poll(() => refresh.releasePrefetch !== undefined).toBe(true);
    await page.getByTestId(feedScroll).evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    refresh.delayPrefetch = false;
    refresh.releasePrefetch?.();
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
    const routes = refresh.routes;
    refresh.routes = [];
    await Promise.all(routes.map((route) => route.close()));
    await expect
      .poll(() => refresh.routes.length, { timeout: 15_000 })
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
