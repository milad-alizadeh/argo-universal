import type { Page, WebSocketRoute } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { Given, When } from './fixtures';
import { reloadApp } from './frame';

// Each page's open WebSockets, which a drop closes under the App.
const connections = new WeakMap<Page, WebSocketRoute[]>();

// Pages whose Connection stays down: each new WebSocket closes at once.
const heldDown = new WeakSet<Page>();

// The ids of each page's `session.new` calls the Server has not answered yet.
const unansweredOpens = new WeakMap<Page, Set<number>>();

const unansweredOf = (page: Page): Set<number> =>
  unansweredOpens.get(page) ?? new Set();

// The App's call that opens a Session.
const SessionOpen = z.looseObject({
  id: z.number(),
  method: z.literal('mutation'),
  params: z.looseObject({ path: z.literal('session.new') }),
});

// The Server's answer to a call: a result or an error, with no method of its own.
const Answer = z.looseObject({ id: z.number(), method: z.never().optional() });

// tRPC's keep-alive frames are plain text; every other frame is one JSON message or a batch.
const keepAlive = new Set(['PING', 'PONG']);

const messagesIn = (frame: string | Buffer): unknown[] =>
  keepAlive.has(String(frame)) ? [] : [JSON.parse(String(frame))].flat();

// The ids of the frame's messages of one kind.
const idsIn = (
  frame: string | Buffer,
  kind: typeof SessionOpen | typeof Answer,
): number[] =>
  messagesIn(frame).flatMap((message) => {
    const parsed = kind.safeParse(message);

    return parsed.success ? [parsed.data.id] : [];
  });

// Forwards both ways, noting the App's Session opens and the Server's answers.
function relay(page: Page, route: WebSocketRoute): void {
  const server = route.connectToServer();
  const unanswered = unansweredOf(page);

  route.onMessage((frame) => {
    for (const id of idsIn(frame, SessionOpen)) unanswered.add(id);
    server.send(frame);
  });
  server.onMessage((frame) => {
    for (const id of idsIn(frame, Answer)) unanswered.delete(id);
    route.send(frame);
  });
}

Given(
  "the App's Connection can be dropped",
  async ({ page }): Promise<void> => {
    connections.set(page, []);
    unansweredOpens.set(page, new Set());
    await page.routeWebSocket(/ws:\/\//, (route): void => {
      if (heldDown.has(page)) {
        void route.close();

        return;
      }

      relay(page, route);
      connections.get(page)?.push(route);
    });
    await reloadApp(page);
  },
);

/*
 * The drop comes between calls. A Session open the Server has done but not yet answered would be lost
 * with the Connection, and the App would open the Session again once it reconnects.
 */
export async function dropConnection(page: Page): Promise<void> {
  await expect.poll(() => unansweredOf(page).size).toBe(0);
  const routes = connections.get(page) ?? [];
  connections.set(page, []);
  await Promise.all(routes.map((route) => route.close()));
}

// The App opens a new WebSocket once it notices.
export async function awaitReconnection(page: Page): Promise<void> {
  await expect
    .poll(() => connections.get(page)?.length ?? 0, { timeout: 15_000 })
    .toBeGreaterThan(0);
  await expect(page.getByText('Reconnecting…')).toHaveCount(0, {
    timeout: 15_000,
  });
}

When('the Connection drops and comes back', async ({ page }): Promise<void> => {
  await dropConnection(page);
  await awaitReconnection(page);
});

When('the Connection drops and stays down', async ({ page }): Promise<void> => {
  heldDown.add(page);
  await dropConnection(page);
});

When('the Connection comes back', async ({ page }): Promise<void> => {
  heldDown.delete(page);
  await awaitReconnection(page);
});
