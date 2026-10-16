import type { WebSocketRoute } from '@playwright/test';
import { z } from 'zod';

// Holds the App's Feed history responses on its WebSocket, so a scenario can order the initial prefetch and a reconnect refresh.

// Request IDs restart on every WebSocket, so each connection keeps its own.
interface Connection {
  route: WebSocketRoute;
  prefetchIds: Set<number>;
  heldPrefetches: (() => void)[];
  heldId?: number;
}

export interface HeldRefresh {
  connections: Connection[];
  armed: boolean;
  delayPrefetch: boolean;
  release?: () => void;
}

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
  connection: Connection,
  request: z.infer<typeof PageRequest>,
): void {
  if (request.params.input.direction === 'before') {
    if (refresh.delayPrefetch) connection.prefetchIds.add(request.id);

    return;
  }

  observeTail(refresh, connection, request.id);
}

function observeTail(
  refresh: HeldRefresh,
  connection: Connection,
  id: number,
): void {
  if (refresh.armed) {
    connection.heldId = id;
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
  connection: Connection,
  message: string | Buffer,
): void {
  const { route } = connection;
  const ids = responseIds(message);

  if (ids.some((id) => connection.prefetchIds.has(id))) {
    connection.heldPrefetches.push(() => route.send(message));

    return;
  }

  const isHeld = ids.some((id) => id === connection.heldId);

  if (isHeld) refresh.release = (): void => route.send(message);
  else route.send(message);
}

export function connect(route: WebSocketRoute, refresh: HeldRefresh): void {
  const server = route.connectToServer();

  const connection: Connection = {
    route,
    prefetchIds: new Set(),
    heldPrefetches: [],
  };

  refresh.connections.push(connection);
  route.onMessage((message) => {
    for (const request of pageRequests(message))
      observePage(refresh, connection, request);
    server.send(message);
  });
  server.onMessage((message) => holdRefresh(refresh, connection, message));
}

// The App's current WebSocket; one held before a reload never reaches the page.
export function latestConnection(refresh: HeldRefresh): Connection {
  const connection = refresh.connections.at(-1);

  if (!connection) throw new Error('The App has not opened a WebSocket');

  return connection;
}

// Sends the held prefetch responses on and holds no more.
export function releasePrefetches(refresh: HeldRefresh): void {
  const connection = latestConnection(refresh);

  refresh.delayPrefetch = false;
  connection.prefetchIds.clear();

  for (const send of connection.heldPrefetches.splice(0)) send();
}
