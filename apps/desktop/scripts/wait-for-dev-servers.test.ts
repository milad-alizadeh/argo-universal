import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { serverAnswers } from './wait-for-dev-servers.mjs';

let home: string;
let mockServer: Server | undefined;

const serverFile = () => join(home, 'server.json');

const writeServerFile = (port: number) =>
  writeFileSync(
    serverFile(),
    JSON.stringify({
      pid: 4242,
      port,
      version: '1.2.3',
      startedAt: '2026-10-03T00:00:00.000Z',
    }),
  );

// Starts an HTTP server whose tRPC system.info answers with `body`, and returns its port.
async function startMockServer(body: unknown) {
  mockServer = createServer((request, response) => {
    if (request.url !== '/trpc/system.info') {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
  });
  const server = mockServer;
  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve()),
  );
  return (server.address() as AddressInfo).port;
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'desktop-dev-servers-'));
});

afterEach(() => {
  mockServer?.close();
  mockServer = undefined;
  rmSync(home, { recursive: true, force: true });
});

describe('serverAnswers', () => {
  it('is false without server.json', async () => {
    expect(await serverAnswers(serverFile())).toBe(false);
  });

  it('is false while nothing answers on the port in server.json', async () => {
    const port = await startMockServer({});
    mockServer?.close();
    writeServerFile(port);

    expect(await serverAnswers(serverFile())).toBe(false);
  });

  it('is false when system.info answers with another shape', async () => {
    writeServerFile(await startMockServer({ result: { data: { ok: true } } }));

    expect(await serverAnswers(serverFile())).toBe(false);
  });

  it('is true once system.info answers on the port in server.json', async () => {
    writeServerFile(
      await startMockServer({
        result: {
          data: {
            version: '1.2.3',
            startedAt: '2026-10-03T00:00:00.000Z',
            pid: 4242,
          },
        },
      }),
    );

    expect(await serverAnswers(serverFile())).toBe(true);
  });
});
