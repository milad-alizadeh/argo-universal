import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { getRequestListener } from '@hono/node-server';
import { appRouter, type Services } from '@repo/api';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';
import { createSystemService } from '../services/system';
import { createHttpApp, createRequestErrorHandler } from './http-app';
import { createRequestGuard } from './request-guard';

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

// Serves HTTP and tRPC over one WebSocket on 127.0.0.1 (ADR 0002); resolves once the port is bound.
export async function startHttpServer(
  options: HttpServerOptions,
): Promise<HttpServer> {
  const { version, startedAt } = options;
  const services: Services = {
    system: createSystemService({ version, startedAt }),
  };

  const guard = createRequestGuard(options.port);
  const app = createHttpApp({
    guard,
    blobsFolder: join(options.home, 'blobs'),
    version,
    startedAt,
  });
  const server = createServer(
    getRequestListener(app.fetch, {
      overrideGlobalObjects: false,
      errorHandler: createRequestErrorHandler(guard),
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
    createContext: () => ({ services }),
    keepAlive: { enabled: true, pingMs: 30_000, pongWaitMs: 5000 },
  });

  // server.close() waits for upgraded sockets, so the WebSocket clients go first.
  const closeAll = async () => {
    handler.broadcastReconnectNotification();
    for (const client of webSocketServer.clients) client.terminate();
    webSocketServer.close();
    await closeServer(server);
  };
  let closing: Promise<void> | undefined;
  const close = () => {
    closing ??= closeAll();
    return closing;
  };

  return { close };
}
