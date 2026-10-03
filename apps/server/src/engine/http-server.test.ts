import { mkdtempSync, rmSync } from 'node:fs';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { startHttpServer } from './http-server';

let home: string;
let port: number;
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

interface HttpRequest {
  host: string;
  method?: string;
  path?: string;
  body?: string;
}

const httpStatus = ({
  host,
  method = 'GET',
  path = '/health',
  body,
}: HttpRequest) =>
  new Promise<number>((resolve, reject) => {
    const outgoing = request(
      { host: '127.0.0.1', port, method, path, headers: { host } },
      (response) => {
        resolve(response.statusCode ?? 0);
        response.resume();
      },
    );
    outgoing.once('error', reject);
    outgoing.end(body);
  });

const healthStatus = (host: string) => httpStatus({ host });

const options = () => ({
  home,
  port,
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
});

beforeEach(async () => {
  home = mkdtempSync(join(tmpdir(), 'server-http-server-'));
  port = await findFreePort();
  ({ close: closeServer } = await startHttpServer(options()));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await closeServer();
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
    expect(await healthStatus(`localhost:${port}`)).toBe(200);
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
    expect(await healthStatus(`127.0.0.1:${port}`)).toBe(200);
    expect(await healthStatus('evil.example:7337')).toBe(403);
  });

  it('answers 403 to a Host the adapter cannot parse, and counts it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await healthStatus(`evil.example@127.0.0.1:${port}`)).toBe(403);
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^engine: rejected request .* #1$/),
    );
  });

  it('answers 405 to a POST with a body', async () => {
    const status = await httpStatus({
      host: `127.0.0.1:${port}`,
      method: 'POST',
      body: '{}',
    });
    expect(status).toBe(405);
    expect(await healthStatus(`127.0.0.1:${port}`)).toBe(200);
  });

  it('rejects a second server on the same port', async () => {
    await expect(startHttpServer(options())).rejects.toMatchObject({
      code: 'EADDRINUSE',
    });
    expect(await healthStatus(`127.0.0.1:${port}`)).toBe(200);
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
