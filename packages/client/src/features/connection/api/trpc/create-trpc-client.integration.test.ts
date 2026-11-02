import { ClockTick } from '@repo/contracts';
import {
  pluginWireVersion,
  type PluginSurface,
} from '@repo/contracts/plugins/kit';
import { startEngineTestHost } from '@repo/engine/mocks';
import { AppPageSocket, appPageFetch } from '@repo/engine/mocks/app-socket';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTRPCClient } from './create-trpc-client';

const binaryMime = 'application/octet-stream';

const serverStartedAt = '2026-10-03T00:00:00.000Z';

const uploadedFileContent = 'file content';

const uploadedBlobId =
  'e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c';

const systemInfo = {
  version: '1.2.3',
  startedAt: serverStartedAt,
  pid: process.pid,
  name: expect.stringMatching(/\S/),
};

// Taken before a test stands in for the page, whose stand-in is a different constructor over this same prototype.
const nativeSocketPrototype = WebSocket.prototype;

const closers: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const close of closers.splice(0)) await close();
});

// Observe browser transport calls while the real Engine owns its listener and router.
async function startTransportTestServer(): Promise<{
  url: string;
  connections: () => number;
  httpRequests: () => number;
}> {
  const host = await startEngineTestHost({ startedAt: serverStartedAt });
  // Node writes no Origin, so the caller stands in for the App's own page, which is what proves the Server Device (#1696).
  vi.stubGlobal('WebSocket', AppPageSocket);
  vi.stubGlobal('fetch', appPageFetch(fetch));
  const sockets = vi.spyOn(globalThis, 'WebSocket');
  const requests = vi.spyOn(globalThis, 'fetch');
  closers.push(() => {
    sockets.mockRestore();
    requests.mockRestore();
    vi.unstubAllGlobals();
  });

  return {
    url: host.url.replace(/^http/, 'ws'),
    connections: (): number => sockets.mock.calls.length,
    httpRequests: (): number => requests.mock.calls.length,
  };
}

describe('createTRPCClient', () => {
  it('reports the Plugin wire version in the WebSocket handshake', async () => {
    const server = await startTransportTestServer();
    const send = vi.spyOn(nativeSocketPrototype, 'send');
    const { client, close } = createTRPCClient(server.url);
    closers.push(close);

    await client.system.info.query();

    expect(send).toHaveBeenCalledWith(
      JSON.stringify({
        method: 'connectionParams',
        data: {
          pluginSurface: JSON.stringify({
            platform: 'web',
            wireVersion: pluginWireVersion,
          }),
        },
      }),
    );
  });

  it('reports an updated surface when the App reconnects', async () => {
    const server = await startTransportTestServer();
    const send = vi.spyOn(nativeSocketPrototype, 'send');
    let surface: PluginSurface = { platform: 'ios', wireVersion: 1 };

    const app = createTRPCClient(server.url, undefined, {
      surface: () => surface,
    });

    closers.push(app.close);

    await app.client.system.info.query();

    surface = { platform: 'ios', wireVersion: 2 };
    app.webSocketClient.connection?.ws?.close();

    await expect
      .poll(() => send)
      .toHaveBeenCalledWith(
        JSON.stringify({
          method: 'connectionParams',
          data: { pluginSurface: JSON.stringify(surface) },
        }),
      );
    expect(await app.client.system.info.query()).toEqual(systemInfo);
    expect(server.connections()).toBe(2);
  });

  it('sends queries and subscriptions over one WebSocket', async () => {
    const server = await startTransportTestServer();
    const { client, close } = createTRPCClient(server.url);
    closers.push(close);

    const info = await client.system.info.query();

    const ticks = await new Promise<unknown[]>((resolve, reject) => {
      const received: unknown[] = [];

      const subscription = client.system.clock.subscribe(undefined, {
        onData: (tick) => {
          received.push(tick);

          if (received.length === 2) {
            subscription.unsubscribe();
            resolve(received);
          }
        },
        onError: reject,
      });
    });

    expect(info).toEqual(systemInfo);
    expect(ticks).toHaveLength(2);

    for (const tick of ticks)
      expect(ClockTick.safeParse(tick).success).toBe(true);
    expect(server.connections()).toBe(1);
    expect(server.httpRequests()).toBe(0);
  });

  it('sends a file over HTTP and everything else over the WebSocket', async () => {
    const server = await startTransportTestServer();
    const trpc = createTRPCClient(server.url);
    closers.push(trpc.close);
    const { client } = trpc;

    const form = new FormData();
    form.set('file', new File([uploadedFileContent], 'notes.txt'));
    expect(await client.blob.upload.mutate(form)).toEqual({
      blobId: uploadedBlobId,
      mime: binaryMime,
      bytes: 12,
    });
    expect(server.httpRequests()).toBe(1);

    expect(await client.system.info.query()).toEqual(systemInfo);
    expect(server.httpRequests()).toBe(1);
    expect(server.connections()).toBe(1);
  });

  it('waits before each WebSocket attempt, but not before an upload', async () => {
    const server = await startTransportTestServer();
    const attemptAllowed = Promise.withResolvers<void>();
    const trpc = createTRPCClient(server.url, () => attemptAllowed.promise);
    closers.push(trpc.close);
    const { client } = trpc;

    const form = new FormData();
    form.set('file', new File([uploadedFileContent], 'notes.txt'));
    expect(await client.blob.upload.mutate(form)).toEqual({
      blobId: uploadedBlobId,
      mime: binaryMime,
      bytes: 12,
    });
    expect(server.connections()).toBe(0);

    attemptAllowed.resolve();
    expect(await client.system.info.query()).toEqual(systemInfo);
    expect(server.connections()).toBe(1);
  });
});
