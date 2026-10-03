import { createServer } from 'node:http';
import { join } from 'node:path';
import { appRouter, type Services } from '@repo/api';
import { openDatabase } from '@repo/db';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';
import { createSystemService } from '../services/system';
import { createHttpRoutes } from './http-routes';

export interface WorkerOptions {
  home: string;
  port: number;
  version: string;
}

// Opens the database, then serves HTTP and tRPC over one WebSocket on 127.0.0.1 (ADR 0002).
export async function startWorker(options: WorkerOptions) {
  const startedAt = new Date().toISOString();
  const database = openDatabase(join(options.home, 'argo.db'));
  const services: Services = {
    system: createSystemService({ version: options.version, startedAt }),
  };

  const server = createServer(
    createHttpRoutes({
      blobsFolder: join(options.home, 'blobs'),
      version: options.version,
      startedAt,
    }),
  );
  const webSocketServer = new WebSocketServer({ server });
  const handler = applyWSSHandler({
    wss: webSocketServer,
    router: appRouter,
    createContext: () => ({ services }),
    keepAlive: { enabled: true, pingMs: 30_000, pongWaitMs: 5000 },
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const close = () => {
    handler.broadcastReconnectNotification();
    for (const client of webSocketServer.clients) client.terminate();
    webSocketServer.close();
    server.close();
    database.$client.close();
  };

  return { startedAt, close };
}
