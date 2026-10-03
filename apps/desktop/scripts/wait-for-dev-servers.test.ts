import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { serverAnswers } from './wait-for-dev-servers.mjs';

let home: string;
let healthServer: Server | undefined;

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

// Starts an HTTP server whose /health answers with `body`, and returns its port.
async function startHealthServer(body: unknown) {
  healthServer = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
  });
  const server = healthServer;
  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve()),
  );
  return (server.address() as AddressInfo).port;
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'desktop-dev-servers-'));
});

afterEach(() => {
  healthServer?.close();
  healthServer = undefined;
  rmSync(home, { recursive: true, force: true });
});

describe('serverAnswers', () => {
  it('is false without server.json', async () => {
    expect(await serverAnswers(serverFile())).toBe(false);
  });

  it('is false while nothing answers on the port in server.json', async () => {
    const port = await startHealthServer({});
    healthServer?.close();
    writeServerFile(port);

    expect(await serverAnswers(serverFile())).toBe(false);
  });

  it('is false when /health answers with another shape', async () => {
    writeServerFile(await startHealthServer({ ok: false }));

    expect(await serverAnswers(serverFile())).toBe(false);
  });

  it('is true once /health answers on the port in server.json', async () => {
    writeServerFile(
      await startHealthServer({
        ok: true,
        version: '1.2.3',
        startedAt: '2026-10-03T00:00:00.000Z',
      }),
    );

    expect(await serverAnswers(serverFile())).toBe(true);
  });
});
