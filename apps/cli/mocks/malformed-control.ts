import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeServerAddress } from '@repo/engine/server-runtime';
import { onTestFinished } from 'vitest';

export async function startMalformedControlHost(
  data: unknown = [{ id: 'project.list' }],
): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'cli-control-'));

  const server = createServer((_, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ result: { data } }));
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  registerCleanup(server, home);
  await writeControlFiles(home, requirePort(server));

  return home;
}

function requirePort(server: Server): number {
  const address = server.address();

  if (!address || typeof address === 'string') throw new Error('No test port');

  return address.port;
}

async function writeControlFiles(home: string, port: number): Promise<void> {
  writeServerAddress(home, {
    pid: process.pid,
    port,
    version: '1.2.3',
    startedAt: '2026-10-03T00:00:00.000Z',
  });
  await writeFile(join(home, 'control.token'), 'test-token');
}

function registerCleanup(server: Server, home: string): void {
  onTestFinished(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(home, { recursive: true, force: true });
  });
}
