import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { appRouter, type Services } from '@repo/api';
import type { TRPCClient } from '@trpc/client';
import { type AnyTRPCRouter, initTRPC } from '@trpc/server';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocketServer } from 'ws';
import { createTRPCClient } from './create-trpc-client';

const systemInfo = {
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  pid: 4242,
};

const services: Services = {
  system: {
    info: () => systemInfo,
    clock: async function* () {
      yield { now: '2026-10-03T00:00:00.000Z' };
      yield { now: '2026-10-03T00:00:01.000Z' };
    },
  },
  feed: {
    page: () => expect.unreachable(),
    row: () => expect.unreachable(),
    subscribe: () => expect.unreachable(),
  },
};

const closers: (() => void)[] = [];
afterEach(() => {
  for (const close of closers.splice(0)) close();
});

const t = initTRPC.create();
const uploadRouter = t.router({
  ping: t.procedure.query(() => 'pong'),
  upload: t.procedure
    .input((value) => {
      if (value instanceof FormData) return value;
      throw new Error('Not a form');
    })
    .mutation(async ({ input }) => {
      const file = input.get('file');
      return file instanceof File ? await file.text() : null;
    }),
});

// Serves one router over the WebSocket and over HTTP at /trpc/ on one server, as the Engine does.
async function startMockServer(router: AnyTRPCRouter = appRouter) {
  const createContext = () => ({ services });
  const handleTRPC = createHTTPHandler({
    router,
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
  applyWSSHandler({ wss: webSocketServer, router, createContext });
  closers.push(() => {
    webSocketServer.close();
    server.closeAllConnections();
    server.close();
  });
  const { port } = server.address() as AddressInfo;
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
      { now: '2026-10-03T00:00:00.000Z' },
      { now: '2026-10-03T00:00:01.000Z' },
    ]);
    expect(server.connections()).toBe(1);
    expect(server.httpRequests()).toBe(0);
  });

  it('sends a file over HTTP and everything else over the WebSocket', async () => {
    const server = await startMockServer(uploadRouter);
    const trpc = createTRPCClient(server.url);
    closers.push(trpc.close);
    const client = trpc.client as unknown as TRPCClient<typeof uploadRouter>;

    const form = new FormData();
    form.set('file', new File(['file content'], 'notes.txt'));
    expect(await client.upload.mutate(form)).toBe('file content');
    expect(server.httpRequests()).toBe(1);

    expect(await client.ping.query()).toBe('pong');
    expect(server.httpRequests()).toBe(1);
    expect(server.connections()).toBe(1);
  });

  it('waits before each WebSocket attempt, but not before an upload', async () => {
    const server = await startMockServer(uploadRouter);
    let allowAttempt = () => {};
    const attemptAllowed = new Promise<void>((resolve) => {
      allowAttempt = resolve;
    });
    const trpc = createTRPCClient(server.url, () => attemptAllowed);
    closers.push(trpc.close);
    const client = trpc.client as unknown as TRPCClient<typeof uploadRouter>;

    const form = new FormData();
    form.set('file', new File(['file content'], 'notes.txt'));
    expect(await client.upload.mutate(form)).toBe('file content');
    expect(server.connections()).toBe(0);

    allowAttempt();
    expect(await client.ping.query()).toBe('pong');
    expect(server.connections()).toBe(1);
  });
});
