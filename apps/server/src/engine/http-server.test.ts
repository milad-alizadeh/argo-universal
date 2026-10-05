import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maxBlobUploadBytes } from '@repo/contracts';
import type { Database } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { createActor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import {
  type RegistryActorRef,
  registryMachine,
} from '../services/sessions/registry-machine';
import { startHttpServer } from './http-server';

let home: string;
let port: number;
let database: Database;
let sessions: RegistryActorRef;
let removeDatabase: () => void;
let closeServer: () => Promise<void>;

const findFreePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() =>
        typeof address === 'object' && address
          ? resolve(address.port)
          : reject(new Error('No free port')),
      );
    });
  });

// Resolves with the HTTP status of the upgrade: 101 when the WebSocket opens.
const upgradeStatus = (headers: Record<string, string>) =>
  new Promise<number>((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`, { headers });
    socket.once('open', () => {
      socket.close();
      resolve(101);
    });
    socket.once('unexpected-response', (_request, response) => {
      resolve(response.statusCode ?? 0);
      response.resume();
    });
    socket.once('error', reject);
  });

// Resolves with the HTTP status of system.info over HTTP.
const systemInfoStatus = (headers: Record<string, string> = {}) =>
  new Promise<number>((resolve, reject) => {
    const outgoing = request(
      {
        host: '127.0.0.1',
        port,
        path: '/trpc/system.info',
        headers: { host: `127.0.0.1:${port}`, ...headers },
      },
      (response) => {
        resolve(response.statusCode ?? 0);
        response.resume();
      },
    );
    outgoing.once('error', reject);
    outgoing.end();
  });

const readdirSafe = (folder: string) =>
  existsSync(folder) ? readdirSync(folder) : [];

const options = () => ({
  home,
  port,
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  database,
  sessions,
});

beforeEach(async () => {
  home = mkdtempSync(join(tmpdir(), 'server-http-server-'));
  port = await findFreePort();
  ({ database, remove: removeDatabase } = openTestDatabase());
  sessions = createActor(registryMachine, {
    input: { database, adapters: [] },
  }).start();
  ({ close: closeServer } = await startHttpServer(options()));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await closeServer();
  sessions.stop();
  removeDatabase();
  rmSync(home, { recursive: true, force: true });
});

describe('http server', () => {
  it.each([
    ['no Origin', {}],
    ['the desktop app', { origin: 'app://app' }],
    ['Expo web on localhost', { origin: 'http://localhost:8081' }],
    ['a web App on 127.0.0.1', { origin: 'http://127.0.0.1:6006' }],
  ])('accepts a WebSocket from %s', async (_name, headers) => {
    expect(await upgradeStatus(headers)).toBe(101);
  });

  it('accepts a WebSocket and HTTP on localhost', async () => {
    expect(await upgradeStatus({ host: `localhost:${port}` })).toBe(101);
    expect(await systemInfoStatus({ host: `localhost:${port}` })).toBe(200);
  });

  it('answers system.info over HTTP', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/trpc/system.info`);
    expect(await response.json()).toEqual({
      result: {
        data: {
          version: '1.2.3',
          startedAt: '2026-10-03T00:00:00.000Z',
          pid: process.pid,
        },
      },
    });
  });

  it('answers feed.page from the database', async () => {
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

  it('stores an upload sent as multipart FormData over HTTP', async () => {
    const form = new FormData();
    form.set('file', new Blob(['png'], { type: 'image/png' }), 'image.png');
    const response = await fetch(`http://127.0.0.1:${port}/trpc/blob.upload`, {
      method: 'POST',
      body: form,
    });
    const { result } = (await response.json()) as {
      result: { data: { blobId: string; bytes: number } };
    };

    expect(response.status).toBe(200);
    expect(result.data).toMatchObject({ bytes: 3 });
    expect(result.data.blobId).toMatch(/^[0-9a-f]{64}$/);
    const stored = await fetch(
      `http://127.0.0.1:${port}/blobs/${result.data.blobId}`,
    );
    expect(await stored.text()).toBe('png');
  });

  it('refuses an upload over 20 MB before reading all of it', async () => {
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(maxBlobUploadBytes + 1)]));
    const response = await fetch(`http://127.0.0.1:${port}/trpc/blob.upload`, {
      method: 'POST',
      body: form,
    });

    expect(response.status).toBe(413);
    expect(readdirSafe(join(home, 'blobs'))).toEqual([]);
  });

  it('refuses a call from another origin over the WebSocket and over HTTP', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const origin = 'https://evil.example';
    expect(await upgradeStatus({ origin })).toBe(403);
    expect(await systemInfoStatus({ origin })).toBe(403);
  });

  it.each(['https://evil.example', 'http://localhost.evil.example', 'null'])(
    'rejects a WebSocket from %s',
    async (origin) => {
      expect(await upgradeStatus({ origin })).toBe(403);
    },
  );

  it('rejects a WebSocket with another Host', async () => {
    expect(await upgradeStatus({ host: 'evil.example:7337' })).toBe(403);
    expect(await upgradeStatus({ host: `127.0.0.1:${port + 1}` })).toBe(403);
  });

  it('rejects HTTP with another Host', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await systemInfoStatus()).toBe(200);
    expect(await systemInfoStatus({ host: 'evil.example:7337' })).toBe(403);
  });

  it('rejects a second server on the same port', async () => {
    await expect(startHttpServer(options())).rejects.toMatchObject({
      code: 'EADDRINUSE',
    });
    expect(await systemInfoStatus()).toBe(200);
  });

  it('closes while a WebSocket client is connected', async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });
    const closed = new Promise((resolve) => socket.once('close', resolve));
    await closeServer();
    await closed;
  });
});
