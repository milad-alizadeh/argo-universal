import { mkdtempSync, rmSync } from 'node:fs';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { startWorker } from './start';

let home: string;
let port: number;
let closeWorker: () => void;

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

const healthStatus = (host: string) =>
  new Promise<number>((resolve, reject) => {
    const outgoing = request(
      { host: '127.0.0.1', port, path: '/health', headers: { host } },
      (response) => {
        resolve(response.statusCode ?? 0);
        response.resume();
      },
    );
    outgoing.once('error', reject);
    outgoing.end();
  });

beforeEach(async () => {
  home = mkdtempSync(join(tmpdir(), 'server-worker-'));
  port = await findFreePort();
  ({ close: closeWorker } = await startWorker({
    home,
    port,
    version: '1.2.3',
  }));
});

afterEach(() => {
  closeWorker();
  rmSync(home, { recursive: true, force: true });
});

describe('worker', () => {
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
});
