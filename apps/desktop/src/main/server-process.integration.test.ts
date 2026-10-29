import { spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { supervisorStopGraceMs } from '@repo/cli/supervisor-command';
import type { ServerAddress } from '@repo/contracts';
import { isAlive, startLimitMs, stopProcess } from '@repo/process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readLiveServerAddress,
  resolveHome,
  spawnSupervisor,
} from './server-process';

let home: string;

const writeServerJson = (pid: number): ServerAddress => {
  const address = {
    pid,
    port: 7337,
    version: '0.9.0',
    startedAt: '2026-10-03T09:00:00.000Z',
  };

  writeFileSync(join(home, 'server.json'), JSON.stringify(address));

  return address;
};

beforeEach((): void => {
  home = mkdtempSync(join(tmpdir(), 'desktop-server-process-'));
});

afterEach((): void => {
  vi.unstubAllEnvs();
  rmSync(home, { recursive: true, force: true });
});

describe('readLiveServerAddress', (): void => {
  it('returns server.json of any version when its pid is alive', (): void => {
    const address = writeServerJson(process.pid);

    expect(readLiveServerAddress(home)).toEqual(address);
  });

  it('returns null when the pid in server.json has exited', (): void => {
    const exited = spawnSync(process.execPath, ['--version']).pid;
    writeServerJson(exited);

    expect(readLiveServerAddress(home)).toBeNull();
  });

  it('returns null without server.json', (): void => {
    expect(readLiveServerAddress(home)).toBeNull();
  });
});

describe('spawnSupervisor', (): void => {
  it('reports the pid before it returns, then the exit of a Supervisor that exits while it starts', async (): Promise<void> => {
    // No bin/argo.mjs here, so Node exits at once.
    const reports: string[] = [];
    let reportsOnReturn: string[] = [];

    const exited = new Promise<void>((resolve): void => {
      spawnSupervisor(
        { home, cliDirectory: home },
        {
          spawned: (pid): number => reports.push(`spawned ${typeof pid}`),
          exited: (reason): void => {
            reports.push(reason);
            resolve();
          },
        },
      );
      reportsOnReturn = [...reports];
    });

    await exited;

    expect(reportsOnReturn).toEqual(['spawned number']);
    expect(reports).toEqual([
      'spawned number',
      `The Supervisor exited while starting (code 1); see ${join(home, 'logs')}`,
    ]);
  });

  it('stops reporting once the returned function runs', async (): Promise<void> => {
    const reports: string[] = [];
    let pid = 0;

    const stopListening = spawnSupervisor(
      { home, cliDirectory: home },
      {
        spawned: (value): void => {
          pid = value;
        },
        exited: (reason): number => reports.push(reason),
      },
    );

    stopListening();

    await expect.poll((): boolean => isAlive(pid)).toBe(false);

    expect(reports).toEqual([]);
  });
});

it.each([
  [undefined, join(homedir(), '.argo')],
  ['', ''],
  [join(homedir(), 'server-runtime'), join(homedir(), 'server-runtime')],
])('resolves ARGO_HOME %s to %s', (override, expected): void => {
  vi.stubEnv('ARGO_HOME', override);
  expect(resolveHome()).toBe(expected);
});

async function availablePort(): Promise<number> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  server.close();

  if (!address || typeof address === 'string') throw new Error('No test port');

  return address.port;
}

it(
  'launches argo server and owns the pid published by its Supervisor',
  async () => {
    const port = await availablePort();
    vi.stubEnv('ARGO_SERVER_PORT', String(port));
    const pids: number[] = [];
    const exited = Promise.withResolvers<void>();

    const cliDirectory = fileURLToPath(
      new URL('../../../cli/', import.meta.url),
    );

    const stopListening = spawnSupervisor(
      { home, cliDirectory },
      {
        spawned: (pid): void => {
          pids.push(pid);
        },
        exited: (): void => exited.resolve(),
      },
    );

    try {
      await expect
        .poll(() => readLiveServerAddress(home), { timeout: 20_000 })
        .toMatchObject({ port });
      expect(pids).toHaveLength(2);
      expect(readLiveServerAddress(home)?.pid).toBe(pids[1]);
    } finally {
      await Promise.all(
        pids.map((pid) => stopProcess(pid, supervisorStopGraceMs)),
      );
      await exited.promise;
      stopListening();
    }
  },
  startLimitMs,
);
