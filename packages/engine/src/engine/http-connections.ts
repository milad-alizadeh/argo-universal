import type { Server } from 'node:http';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer, type VerifyClientCallbackAsync } from 'ws';
import { createRpcContext } from '../rpc';
import type { RequestGuard } from './request-guard';
import type { AppRouter } from './router';

const forbiddenStatus = 403;

const closeServer = (server: Server): Promise<void> =>
  new Promise<void>((resolve, reject): Server =>
    server.close((error): void => (error ? reject(error) : resolve())),
  );

export function connectWebSockets(
  server: Server,
  router: AppRouter,
  guard: RequestGuard,
): () => Promise<void> {
  // Attached after listen: ws re-emits the server's 'error', so a failed listen would throw from it.
  const webSocketServer = createWebSocketServer(server, guard);

  const handler = applyWSSHandler({
    wss: webSocketServer,
    router,
    createContext: ({ req, info }) =>
      createRpcContext(req.socket, info.connectionParams),
    keepAlive: { enabled: true, pingMs: 30_000, pongWaitMs: 5000 },
  });

  return closeConnections({ handler, webSocketServer, server });
}

type HttpConnections = {
  handler: ReturnType<typeof applyWSSHandler>;
  webSocketServer: WebSocketServer;
  server: Server;
};

function closeConnections({
  handler,
  webSocketServer,
  server,
}: HttpConnections): () => Promise<void> {
  // server.close() waits for upgraded sockets, so the WebSocket clients go first.
  return async (): Promise<void> => {
    handler.broadcastReconnectNotification();

    for (const client of webSocketServer.clients) client.terminate();
    webSocketServer.close();
    const closed = closeServer(server);
    // close() would otherwise wait out the keep-alive timeout of an HTTP socket that turns idle later.
    server.closeAllConnections();
    await closed;
  };
}

export function admitClose(
  commandAdmission: AbortController,
  closeConnections: () => Promise<void>,
): () => Promise<void> {
  let closing: Promise<void> | undefined;

  return (): Promise<void> => {
    commandAdmission.abort();
    closing ??= closeConnections();

    return closing;
  };
}

function createWebSocketServer(
  server: Server,
  guard: RequestGuard,
): WebSocketServer {
  return new WebSocketServer({
    server,
    verifyClient: verifyUpgrade(guard),
  });
}

function verifyUpgrade(guard: RequestGuard): VerifyClientCallbackAsync {
  return ({ req }, callback): void =>
    callback(
      guard.allowsUpgrade({
        host: req.headers.host,
        origin: req.headers.origin,
      }),
      forbiddenStatus,
      'Forbidden',
    );
}
