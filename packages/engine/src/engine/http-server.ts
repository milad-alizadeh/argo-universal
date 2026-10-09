import { createServer, type Server } from 'node:http';
import type { Database } from '@repo/db';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';
import { blobsFolderIn } from '../services/blob';
import type { RegistryActorRef } from '../services/sessions';
import { createEngineContext, type Context } from './context';
import { createRequestGuard } from './request-guard';
import { createRequestListener } from './request-listener';
import { appRouter } from './router';

export interface HttpServerOptions {
  home: string;
  createId: () => string;
  port: number;
  version: string;
  startedAt: string;
  database: Database;
  sessions: RegistryActorRef;
}

export interface HttpServer {
  close: () => Promise<void>;
}

const forbiddenStatus = 403;

const listen = (server: Server, port: number): Promise<void> =>
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

// Serves one tRPC router over the WebSocket and over HTTP, and blobs, on 127.0.0.1 (ADR 0002); resolves once the port is bound.
export async function startHttpServer(
  options: HttpServerOptions,
): Promise<HttpServer> {
  const blobsFolder = blobsFolderIn(options.home);
  const context = createEngineContext({ ...options, blobsFolder });

  const createContext = (): Context => context;

  const guard = createRequestGuard(options.port);
  const server = createServer(
    createRequestListener({
      guard,
      blobsFolder,
      router: appRouter,
      createContext,
    }),
  );

  await listen(server, options.port);

  // Attached after listen: ws re-emits the server's 'error', so a failed listen would throw from it.
  const webSocketServer = new WebSocketServer({
    server,
    verifyClient: ({ req }, callback): void =>
      callback(
        guard.allowsUpgrade({
          host: req.headers.host,
          origin: req.headers.origin,
        }),
        forbiddenStatus,
        'Forbidden',
      ),
  });
  const handler = applyWSSHandler({
    wss: webSocketServer,
    router: appRouter,
    createContext,
    keepAlive: { enabled: true, pingMs: 30_000, pongWaitMs: 5000 },
  });

  // server.close() waits for upgraded sockets, so the WebSocket clients go first.
  const closeAll = async (): Promise<void> => {
    handler.broadcastReconnectNotification();
    for (const client of webSocketServer.clients) client.terminate();
    webSocketServer.close();
    const closed = closeServer(server);
    // close() would otherwise wait out the keep-alive timeout of an HTTP socket that turns idle later.
    server.closeAllConnections();
    await closed;
  };
  let closing: Promise<void> | undefined;
  const close = (): Promise<void> => {
    closing ??= closeAll();
    return closing;
  };

  return { close };
}
