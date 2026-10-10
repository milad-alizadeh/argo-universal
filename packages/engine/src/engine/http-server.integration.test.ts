import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { request } from 'node:http';
import { join } from 'node:path';
import { agentAdapters, type VendorCommand } from '@repo/agents';
import { BlobUploadOutput, maxBlobUploadBytes } from '@repo/contracts';
import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { createMockAdapter, mockReady } from '@repo/mocks/agent';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { z } from 'zod';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import type { RegistryActorRef } from '../services/sessions';
import { startHttpServer, type HttpServerOptions } from './http-server';

let home: string;
let port: number;
let database: Database;
let sessions: RegistryActorRef;
let databaseWriter: HttpServerOptions['databaseWriter'];
let removeDatabase: () => void;
let closeServer: () => Promise<void>;

// Resolves with the HTTP status of the upgrade: 101 when the WebSocket opens.
const upgradeStatus = (headers: Record<string, string>): Promise<number> =>
  new Promise<number>((resolve, reject): void => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`, { headers });
    socket.once('open', (): void => {
      socket.close();
      resolve(101);
    });
    socket.once('unexpected-response', (_request, response): void => {
      resolve(response.statusCode ?? 0);
      response.resume();
    });
    socket.once('error', reject);
  });

// Resolves with the HTTP status of system.info over HTTP.
const systemInfoStatus = (
  headers: Record<string, string> = {},
): Promise<number> =>
  new Promise<number>((resolve, reject): void => {
    const outgoing = request(
      {
        host: '127.0.0.1',
        port,
        path: '/trpc/system.info',
        headers: { host: `127.0.0.1:${port}`, ...headers },
      },
      (response): void => {
        resolve(response.statusCode ?? 0);
        response.resume();
      },
    );
    outgoing.once('error', reject);
    outgoing.end();
  });

const readdirSafe = (folder: string): string[] =>
  existsSync(folder) ? readdirSync(folder) : [];

let syncSupervisor: HttpServerOptions['syncSupervisor'];

const options = (): HttpServerOptions => ({
  createId: randomUUID,
  home,
  port,
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  database,
  sessions,
  databaseWriter,
  syncSupervisor,
});

beforeEach(async (): Promise<void> => {
  const stored = openTestDatabase();
  database = stored.database;
  removeDatabase = stored.remove;
  const started = await startEngineTestHost({ database });
  syncSupervisor = started.engine.system.get('syncSupervisor');
  home = started.home;
  port = Number(new URL(started.url).port);
  sessions = started.sessionRegistry;
  databaseWriter = started.databaseWriter;
  closeServer = started.stop;
});

afterEach(async (): Promise<void> => {
  await closeServer();
  removeDatabase();
  rmSync(home, { recursive: true, force: true });
});

describe('http server', (): void => {
  it.each([
    ['no Origin', {}],
    ['the desktop app', { origin: 'app://app' }],
    ['Expo web on localhost', { origin: 'http://localhost:8081' }],
    ['a web App on 127.0.0.1', { origin: 'http://127.0.0.1:6006' }],
  ])('accepts a WebSocket from %s', async (_name, headers): Promise<void> => {
    expect(await upgradeStatus(headers)).toBe(101);
  });

  it('accepts a WebSocket and HTTP on localhost', async (): Promise<void> => {
    expect(await upgradeStatus({ host: `localhost:${port}` })).toBe(101);
    expect(await systemInfoStatus({ host: `localhost:${port}` })).toBe(200);
  });

  it('answers system.info over HTTP', async (): Promise<void> => {
    const response = await fetch(`http://127.0.0.1:${port}/trpc/system.info`);
    expect(await response.json()).toEqual({
      result: {
        data: {
          version: '1.2.3',
          startedAt: '2026-10-03T00:00:00.000Z',
          pid: process.pid,
          name: expect.any(String),
        },
      },
    });
  });

  it('answers feed.page from the database', async (): Promise<void> => {
    const input = encodeURIComponent(
      JSON.stringify({ sessionId: 'session-1', direction: 'tail' }),
    );
    const response = await fetch(
      `http://127.0.0.1:${port}/trpc/feed.page?input=${input}`,
    );
    expect(await response.json()).toMatchObject({
      result: { data: { epoch: 0, rows: [], startCursor: null } },
    });
  });

  it('stores an upload sent as multipart FormData over HTTP', async (): Promise<void> => {
    const form = new FormData();
    form.set('file', new Blob(['png'], { type: 'image/png' }), 'image.png');
    const response = await fetch(`http://127.0.0.1:${port}/trpc/blob.upload`, {
      method: 'POST',
      body: form,
    });
    const { result } = z
      .object({ result: z.object({ data: BlobUploadOutput }) })
      .parse(await response.json());

    expect(response.status).toBe(200);
    expect(result.data).toMatchObject({ bytes: 3 });
    expect(result.data.blobId).toMatch(/^[0-9a-f]{64}$/);
    const stored = await fetch(
      `http://127.0.0.1:${port}/blobs/${result.data.blobId}`,
    );
    expect(await stored.text()).toBe('png');
  });

  it('refuses an upload over 20 MB before reading all of it', async (): Promise<void> => {
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(maxBlobUploadBytes + 1)]));
    const response = await fetch(`http://127.0.0.1:${port}/trpc/blob.upload`, {
      method: 'POST',
      body: form,
    });

    expect(response.status).toBe(413);
    expect(readdirSafe(join(home, 'blobs'))).toEqual([]);
  });

  it('refuses a call from another origin over the WebSocket and over HTTP', async (): Promise<void> => {
    vi.spyOn(console, 'error').mockImplementation((): void => {});
    const origin = 'https://evil.example';
    expect(await upgradeStatus({ origin })).toBe(403);
    expect(await systemInfoStatus({ origin })).toBe(403);
  });

  it.each(['https://evil.example', 'http://localhost.evil.example', 'null'])(
    'rejects a WebSocket from %s',
    async (origin): Promise<void> => {
      expect(await upgradeStatus({ origin })).toBe(403);
    },
  );

  it('rejects a WebSocket with another Host', async (): Promise<void> => {
    expect(await upgradeStatus({ host: 'evil.example:7337' })).toBe(403);
    expect(await upgradeStatus({ host: `127.0.0.1:${port + 1}` })).toBe(403);
  });

  it('rejects HTTP with another Host', async (): Promise<void> => {
    vi.spyOn(console, 'error').mockImplementation((): void => {});
    expect(await systemInfoStatus()).toBe(200);
    expect(await systemInfoStatus({ host: 'evil.example:7337' })).toBe(403);
  });

  it('rejects a second server on the same port', async (): Promise<void> => {
    await expect(startHttpServer(options())).rejects.toMatchObject({
      code: 'EADDRINUSE',
    });
    expect(await systemInfoStatus()).toBe(200);
  });

  it('closes while a WebSocket client is connected', async (): Promise<void> => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise((resolve, reject): void => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });
    const closed = new Promise((resolve): WebSocket =>
      socket.once('close', resolve),
    );
    await closeServer();
    await closed;
    expect(socket.readyState).toBe(WebSocket.CLOSED);
  });
});

it.each(agentAdapters.map((adapter): string => adapter.agent))(
  'does not send the waiting %s prompt after HTTP closure begins',
  async (agent): Promise<void> => {
    await closeServer();
    const startup = Promise.withResolvers<typeof mockReady>();
    const began = Promise.withResolvers<void>();
    const commands: VendorCommand[] = [];
    const host = await startEngineTestHost({
      database,
      runtimeDirectory: home,
      adapters: [
        createMockAdapter(
          {
            connect: (): Promise<typeof mockReady> => {
              began.resolve();
              return startup.promise;
            },
            stream: (stream): undefined => {
              stream.receive((command): number => commands.push(command));
            },
          },
          agent,
        ),
      ],
    });
    database.update(session).set({ agent }).run();
    closeServer = host.stop;
    port = Number(new URL(host.url).port);
    const response = fetch(`http://127.0.0.1:${port}/trpc/session.prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session-1',
        prompt: [{ type: 'text', text: 'Too late' }],
      }),
    }).catch((): null => null);
    await began.promise;
    const closing = closeServer();
    startup.resolve(mockReady);
    await closing;
    await new Promise<void>((resolve): NodeJS.Immediate =>
      setImmediate(resolve),
    );
    expect(commands).toEqual([]);
    await response;
  },
);
