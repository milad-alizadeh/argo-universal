import { createServer, type Server } from 'node:http';
import { mockUpload, unreachableServices } from '@repo/engine/mocks';
import { appRouter } from '@repo/engine/router';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocketServer } from 'ws';
import { createTRPCClient } from './create-trpc-client';

const binaryMime = 'application/octet-stream';

const serverStartedAt = '2026-10-03T00:00:00.000Z';
const uploadedFileContent = 'file content';

const systemInfo = {
  version: '1.2.3',
  startedAt: serverStartedAt,
  pid: 4242,
  name: "Milad's Mac mini",
};

const services = unreachableServices({
  blob: { upload: mockUpload },
  system: {
    info: () => systemInfo,
    clock: async function* () {
      yield { now: serverStartedAt };
      yield { now: '2026-10-03T00:00:01.000Z' };
    },
  },
});

const closers: (() => void)[] = [];
afterEach(() => {
  for (const close of closers.splice(0)) close();
});

const tcpPort = (server: Pick<Server, 'address'>): number => {
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Server has no TCP address');
  return address.port;
};

// Serves one router over the WebSocket and over HTTP at /trpc/ on one server, as the Engine does.
async function startMockServer(): Promise<{
  url: string;
  connections: () => number;
  httpRequests: () => number;
}> {
  const createContext = (): { services: typeof services } => ({ services });
  const handleTRPC = createHTTPHandler({
    router: appRouter,
    createContext,
    basePath: '/trpc/',
  });
  let httpRequests = 0;
  const server = createServer((request, response) => {
    httpRequests++;
    handleTRPC(request, response);
  });
  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve()),
  );
  const webSocketServer = new WebSocketServer({ server });
  let connections = 0;
  webSocketServer.on('connection', () => connections++);
  applyWSSHandler({ wss: webSocketServer, router: appRouter, createContext });
  closers.push(() => {
    webSocketServer.close();
    server.closeAllConnections();
    server.close();
  });
  const port = tcpPort(server);
  return {
    url: `ws://127.0.0.1:${port}`,
    connections: () => connections,
    httpRequests: () => httpRequests,
  };
}

describe('createTRPCClient', () => {
  it('sends queries and subscriptions over one WebSocket', async () => {
    const server = await startMockServer();
    const { client, close } = createTRPCClient(server.url);
    closers.push(close);

    const info = await client.system.info.query();
    const ticks = await new Promise<unknown[]>((resolve, reject) => {
      const received: unknown[] = [];
      client.system.clock.subscribe(undefined, {
        onData: (tick) => received.push(tick),
        onComplete: () => resolve(received),
        onError: reject,
      });
    });

    expect(info).toEqual(systemInfo);
    expect(ticks).toEqual([
      { now: serverStartedAt },
      { now: '2026-10-03T00:00:01.000Z' },
    ]);
    expect(server.connections()).toBe(1);
    expect(server.httpRequests()).toBe(0);
  });

  it('sends a file over HTTP and everything else over the WebSocket', async () => {
    const server = await startMockServer();
    const trpc = createTRPCClient(server.url);
    closers.push(trpc.close);
    const { client } = trpc;

    const form = new FormData();
    form.set('file', new File([uploadedFileContent], 'notes.txt'));
    expect(await client.blob.upload.mutate(form)).toEqual({
      blobId: uploadedFileContent,
      mime: binaryMime,
      bytes: 12,
    });
    expect(server.httpRequests()).toBe(1);

    expect(await client.system.info.query()).toEqual(systemInfo);
    expect(server.httpRequests()).toBe(1);
    expect(server.connections()).toBe(1);
  });

  it('waits before each WebSocket attempt, but not before an upload', async () => {
    const server = await startMockServer();
    let allowAttempt = (): void => {};
    const attemptAllowed = new Promise<void>((resolve) => {
      allowAttempt = resolve;
    });
    const trpc = createTRPCClient(server.url, () => attemptAllowed);
    closers.push(trpc.close);
    const { client } = trpc;

    const form = new FormData();
    form.set('file', new File([uploadedFileContent], 'notes.txt'));
    expect(await client.blob.upload.mutate(form)).toEqual({
      blobId: uploadedFileContent,
      mime: binaryMime,
      bytes: 12,
    });
    expect(server.connections()).toBe(0);

    allowAttempt();
    expect(await client.system.info.query()).toEqual(systemInfo);
    expect(server.connections()).toBe(1);
  });
});
