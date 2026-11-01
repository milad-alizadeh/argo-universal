import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readControlToken,
  readServerAddress,
} from '@repo/engine/server-runtime';
import { expect, it } from 'vitest';

const bin = fileURLToPath(new URL('../bin/argo.mjs', import.meta.url));

const projectPath = fileURLToPath(new URL('../../../', import.meta.url));

async function availablePort(): Promise<number> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  server.close();

  if (!address || typeof address === 'string') throw new Error('No test port');

  return address.port;
}

it('server publishes its address and shuts down with the CLI', async () => {
  const home = await mkdtemp(join(tmpdir(), 'argo-cli-server-'));
  const port = await availablePort();

  const child = spawn(process.execPath, [bin, 'server'], {
    cwd: tmpdir(),
    env: {
      ...process.env,
      ARGO_HOME: home,
      ARGO_SERVER_PORT: String(port),
      ARGO_PROJECT_PATH: projectPath,
    },
    stdio: 'ignore',
  });

  const exited = once(child, 'exit');

  try {
    await expect
      .poll(() => readServerAddress(home), { timeout: 20_000 })
      .toMatchObject({ port });

    const response = await fetch(`http://127.0.0.1:${port}/trpc/system.info`, {
      headers: { authorization: `Bearer ${await readControlToken(home)}` },
    });

    expect(response.ok).toBe(true);
  } finally {
    child.kill('SIGTERM');
    await exited;
    expect(readServerAddress(home)).toBeNull();
    await rm(home, { recursive: true, force: true });
  }
}, 30_000);
