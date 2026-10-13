import { createServer, type Server } from 'node:http';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer, type VerifyClientCallbackAsync } from 'ws';
import { createRequestGuard, type RequestGuard } from './request-guard';
import {
  createRequestListener,
  type RequestListenerOptions,
} from './request-listener';
import type { AppRouter } from './router';

const forbiddenStatus = 403;

const listenOnLoopback = (server: Server, port: number): Promise<void> =>
  new Promise<void>((resolve, reject): void => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', (): void => {
      server.off('error', reject);
      resolve();
    });
  });

const closeServer = (server: Server): Promise<void> =>
  new Promise<void>((resolve, reject): Server =>
    server.close((error): void => (error ? reject(error) : resolve())),
  );

const verifyUpgrade =
  (guard: RequestGuard): VerifyClientCallbackAsync =>
  ({ req }, callback): void =>
    callback(
      guard.allowsUpgrade({
        host: req.headers.host,
        origin: req.headers.origin,
      }),
      forbiddenStatus,
      'Forbidden',
    );

function closeConnections(
  server: Server,
  sockets: WebSocketServer,
): Promise<void> {
  // HTTP close waits for upgraded sockets, so WebSocket clients go first.
  for (const client of sockets.clients) client.terminate();
  sockets.close();
  const closed = closeServer(server);
  // Do not wait out HTTP keep-alive sockets that turn idle later.
  server.closeAllConnections();
  return closed;
}

function serveWebSocketRouter(
  sockets: WebSocketServer,
  router: AppRouter,
): ReturnType<typeof applyWSSHandler> {
  return applyWSSHandler({
    wss: sockets,
    router,
    keepAlive: { enabled: true, pingMs: 30_000, pongWaitMs: 5000 },
  });
}

function transportCloser(
  server: Server,
  sockets: WebSocketServer,
  router: AppRouter,
): () => Promise<void> {
  const handler = serveWebSocketRouter(sockets, router);
  const close = async (): Promise<void> => {
    handler.broadcastReconnectNotification();
    await closeConnections(server, sockets);
  };
  let closing: Promise<void> | undefined;
  return (): Promise<void> => (closing ??= close());
}

export async function startHttpTransport(
  options: Omit<RequestListenerOptions, 'guard'> & { port: number },
): Promise<() => Promise<void>> {
  const guard = createRequestGuard(options.port);
  const server = createServer(createRequestListener({ ...options, guard }));
  await listenOnLoopback(server, options.port);
  // Attach after listen: ws re-emits errors, so a failed listen would throw from it.
  const sockets = new WebSocketServer({
    server,
    verifyClient: verifyUpgrade(guard),
  });
  return transportCloser(server, sockets, options.router);
}
