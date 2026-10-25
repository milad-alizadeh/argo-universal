import { createServer, type Server } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, beforeAll } from 'vitest';

// The callback port is fixed, so test files that bind it take turns; the kernel frees this lock port when a crashed run ends.
const lockPort = 51_790;

async function tryTake(): Promise<Server | undefined> {
  const server = createServer();

  return new Promise((resolve) => {
    server.once('error', () => resolve(void 0));
    server.listen({ port: lockPort, host: '127.0.0.1', exclusive: true }, () =>
      resolve(server),
    );
  });
}

async function take(): Promise<Server> {
  const server = await tryTake();

  if (server) return server;
  await delay(200);

  return take();
}

// Call once at the top of every test file that binds the OAuth callback port.
export function serialiseOnOAuthPort(): void {
  let held: Server | undefined;

  beforeAll(async () => {
    held = await take();
  }, 120_000);
  afterAll(async () => {
    await new Promise((resolve) => held?.close(resolve));
  });
}
