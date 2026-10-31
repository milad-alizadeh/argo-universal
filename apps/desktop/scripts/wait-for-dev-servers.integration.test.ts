import type { IncomingMessage, ServerResponse } from 'http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { controlTokenPath } from '@repo/engine/server-runtime';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { serverAnswers } from './wait-for-dev-servers.mjs';

let home: string;

let mockServer: Server | undefined;

const serverFile = (): string => join(home, 'server.json');

const token = 'a-user-token';

const startedAt = '2026-10-03T00:00:00.000Z';

const writeControlToken = (): void =>
  writeFileSync(controlTokenPath(home), `${token}\n`);

const writeServerFile = (port: number): void =>
  writeFileSync(
    serverFile(),
    JSON.stringify({
      pid: 4242,
      port,
      version: '1.2.3',
      startedAt,
    }),
  );

/*
 * Starts an HTTP server whose tRPC system.info answers with the JSON text `body`, and returns its port.
 * It refuses an unproved request the way the Server does (#1696), so a script that stops showing its token fails here rather than in `pnpm dev`.
 */
async function startMockServer(body: string): Promise<number> {
  mockServer = createServer((request, response): void => {
    if (request.url !== '/trpc/system.info') {
      response.writeHead(404).end();

      return;
    }

    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401).end();

      return;
    }

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(body);
  });
  const server = mockServer;
  await new Promise<void>(
    (resolve): Server<typeof IncomingMessage, typeof ServerResponse> =>
      server.listen(0, '127.0.0.1', (): void => resolve()),
  );
  const address = server.address();

  if (!address || typeof address === 'string')
    throw new Error('Server has no TCP address');

  return address.port;
}

beforeEach((): void => {
  home = mkdtempSync(join(tmpdir(), 'desktop-dev-servers-'));
  writeControlToken();
});

afterEach((): void => {
  mockServer?.close();
  mockServer = undefined;
  rmSync(home, { recursive: true, force: true });
});

describe('serverAnswers', (): void => {
  it('is false without server.json', async (): Promise<void> => {
    expect(await serverAnswers(home)).toBe(false);
  });

  it('is false while nothing answers on the port in server.json', async (): Promise<void> => {
    const port = await startMockServer('{}');
    mockServer?.close();
    writeServerFile(port);

    expect(await serverAnswers(home)).toBe(false);
  });

  it('is false when system.info answers with another shape', async (): Promise<void> => {
    writeServerFile(
      await startMockServer(JSON.stringify({ result: { data: { ok: true } } })),
    );

    expect(await serverAnswers(home)).toBe(false);
  });

  it('is true once system.info answers on the port in server.json', async (): Promise<void> => {
    writeServerFile(
      await startMockServer(
        JSON.stringify({
          result: {
            data: {
              version: '1.2.3',
              startedAt,
              pid: 4242,
            },
          },
        }),
      ),
    );

    expect(await serverAnswers(home)).toBe(true);
  });

  // A Server that is up but refuses this script reads as not up, which is what made `pnpm dev` wait out its five minutes.
  it('is false when the Server refuses an unproved request', async (): Promise<void> => {
    rmSync(controlTokenPath(home));
    writeServerFile(
      await startMockServer(
        JSON.stringify({
          result: {
            data: {
              version: '1.2.3',
              startedAt,
              pid: 4242,
            },
          },
        }),
      ),
    );

    expect(await serverAnswers(home)).toBe(false);
  });
});
