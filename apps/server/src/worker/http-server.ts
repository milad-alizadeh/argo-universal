import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { getRequestListener } from '@hono/node-server';
import { appRouter, type Services } from '@repo/api';
import { openDatabase } from '@repo/db';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';
import { createSystemService } from '../services/system';
import { createHttpApp, createRequestErrorHandler } from './http-app';
import { createRequestGuard } from './request-guard';

export interface WorkerOptions {
  home: string;
  port: number;
  version: string;
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

// Opens the database, then serves HTTP and tRPC over one WebSocket on 127.0.0.1 (ADR 0002).
export async function startWorker(options: WorkerOptions) {
  const startedAt = new Date().toISOString();
  const database = openDatabase(join(options.home, 'argo.db'));
  const services: Services = {
    system: createSystemService({ version: options.version, startedAt }),
  };

  const guard = createRequestGuard(options.port);
  const app = createHttpApp({
    guard,
    blobsFolder: join(options.home, 'blobs'),
    version: options.version,
    startedAt,
  });
  const server = createServer(
    getRequestListener(app.fetch, {
      overrideGlobalObjects: false,
      errorHandler: createRequestErrorHandler(guard),
    }),
  );

  try {
    await listen(server, options.port);
  } catch (error) {
    database.$client.close();
    throw error;
  }

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
    try {
      await closeServer(server);
    } finally {
      database.$client.close();
    }
  };
  let closing: Promise<void> | undefined;
  const close = () => {
    closing ??= closeAll();
    return closing;
  };

  return { startedAt, close };
}
