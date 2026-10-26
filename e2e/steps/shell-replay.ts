import type { Page, WebSocketRoute } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { Given, When } from './fixtures';
import { reloadApp } from './frame';
import { framesMatching } from './web-socket-frames';

const ShellRead = z.object({
  id: z.number(),
  params: z.object({ path: z.literal('shell.output') }),
});

const Reply = z.object({
  id: z.number(),
  result: z.object({ type: z.literal('data') }),
});

const Frame = z.json();

interface Replay {
  routes: WebSocketRoute[];
  delayed: boolean;
  held: number;
}

interface Relay {
  route: WebSocketRoute;
  replay: Replay;
  reads: Set<number>;
}

const replays = new WeakMap<Page, Replay>();

function relay(route: WebSocketRoute, replay: Replay): void {
  const server = route.connectToServer();
  const reads = new Set<number>();
  replay.routes.push(route);
  route.onMessage((message) => {
    for (const read of framesMatching(message, ShellRead)) reads.add(read.id);
    server.send(message);
  });
  server.onMessage((message) =>
    replay.delayed
      ? holdOutput({ route, replay, reads }, message)
      : route.send(message),
  );
}

function holdOutput(relay: Relay, message: string | Buffer): void {
  const replies = framesMatching(message, Frame);

  if (replies.length === 0) return relay.route.send(message);

  for (const reply of replies) relayReply(relay, reply);
}

function relayReply(
  { route, replay, reads }: Relay,
  frame: z.infer<typeof Frame>,
): void {
  const reply = Reply.safeParse(frame);

  if (reply.success && reads.has(reply.data.id)) {
    replay.held += 1;

    return;
  }

  route.send(JSON.stringify(frame));
}

Given('Shell output replay can be delayed', async ({ page }) => {
  const replay: Replay = { routes: [], delayed: false, held: 0 };
  replays.set(page, replay);
  await page.routeWebSocket(/ws:\/\//, (route) => relay(route, replay));
  await reloadApp(page);
});

When(
  'the Connection reconnects with Shell output replay delayed',
  async ({ page }) => {
    const replay = replays.get(page);

    if (!replay) throw new Error('Shell output replay was not prepared');
    replay.delayed = true;
    await Promise.all(replay.routes.map((route) => route.close()));
    await expect
      .poll(() => replay.held, { timeout: 15_000 })
      .toBeGreaterThan(0);
  },
);
