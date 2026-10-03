// @vitest-environment node
import type { AddressInfo } from 'node:net';
import { appRouter, type Services } from '@argo/api';
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
};

const closers: (() => void)[] = [];
afterEach(() => {
  for (const close of closers.splice(0)) close();
});

async function startServer() {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await new Promise((resolve) => server.once('listening', resolve));
  let connections = 0;
  server.on('connection', () => connections++);
  applyWSSHandler({
    wss: server,
    router: appRouter,
    createContext: () => ({ services }),
  });
  closers.push(() => server.close());
  const { port } = server.address() as AddressInfo;
  return { url: `ws://127.0.0.1:${port}`, connections: () => connections };
}

describe('createTRPCClient', () => {
  it('sends queries and subscriptions over one WebSocket', async () => {
    const server = await startServer();
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
  });
});
