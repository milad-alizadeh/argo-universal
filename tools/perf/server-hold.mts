import type { Page, WebSocketRoute } from '@playwright/test';
import type { SeededServer } from './seed.mts';

// Longest the Server's replies are held; the tRPC socket drops a connection that stays silent for more than a second.
const holdLimitMilliseconds = 800;

/*
 * Holds back what the Server sends the page, so a reply cannot land before the harness is ready for
 * it, and lets it through when told to. Messages the page sends are never held.
 */
export interface ServerHold {
  start: () => void;
  release: () => void;
}

interface Queue {
  holding: boolean;
  held: (() => void)[];
  timer?: ReturnType<typeof setTimeout>;
}

function release(queue: Queue): void {
  queue.holding = false;
  clearTimeout(queue.timer);

  for (const send of queue.held.splice(0)) send();
}

function start(queue: Queue): void {
  queue.holding = true;
  queue.timer = setTimeout(() => release(queue), holdLimitMilliseconds);
}

function deliver(queue: Queue, send: () => void): void {
  if (queue.holding) queue.held.push(send);
  else send();
}

const relay =
  (queue: Queue) =>
  (socket: WebSocketRoute): void => {
    const upstream = socket.connectToServer();
    socket.onMessage((message) => upstream.send(message));
    upstream.onMessage((message) => deliver(queue, () => socket.send(message)));
  };

export async function holdServer(
  page: Page,
  server: SeededServer,
): Promise<ServerHold> {
  const queue: Queue = { holding: false, held: [] };

  await page.routeWebSocket(
    (url) => url.href.startsWith(server.serverUrl),
    relay(queue),
  );

  return { start: () => start(queue), release: () => release(queue) };
}
