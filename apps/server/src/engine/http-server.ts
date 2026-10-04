import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { appRouter, type Services } from '@repo/api';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';
import { createSystemService } from '../services/system';
import { createRequestGuard } from './request-guard';
import { createRequestListener } from './request-listener';

export interface HttpServerOptions {
  home: string;
  port: number;
  version: string;
  startedAt: string;
}

export interface HttpServer {
  close: () => Promise<void>;
}

const listen = (server: Server, port: number) =>
  new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

const closeServer = (server: Server) =>
  new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );

// Serves one tRPC router over the WebSocket and over HTTP, and blobs, on 127.0.0.1 (ADR 0002); resolves once the port is bound.
export async function startHttpServer(
  options: HttpServerOptions,
): Promise<HttpServer> {
  const { version, startedAt } = options;
  const services: Services = {
    system: createSystemService({ version, startedAt }),
  };

  const createContext = () => ({ services });

  const guard = createRequestGuard(options.port);
  const server = createServer(
    createRequestListener({
      guard,
      blobsFolder: join(options.home, 'blobs'),
      router: appRouter,
      createContext,
    }),
  );

  await listen(server, options.port);

  // Attached after listen: ws re-emits the server's 'error', so a failed listen would throw from it.
  const webSocketServer = new WebSocketServer({
    server,
    verifyClient: ({ req }, callback) =>
      callback(
        guard.allowsUpgrade({
          host: req.headers.host,
          origin: req.headers.origin,
        }),
        403,
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
  const closeAll = async () => {
    handler.broadcastReconnectNotification();
    for (const client of webSocketServer.clients) client.terminate();
    webSocketServer.close();
    const closed = closeServer(server);
    // close() would otherwise wait out the keep-alive timeout of an HTTP socket that turns idle later.
    server.closeAllConnections();
    await closed;
  };
  let closing: Promise<void> | undefined;
  const close = () => {
    closing ??= closeAll();
    return closing;
  };

  return { close };
}
