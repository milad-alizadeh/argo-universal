import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  readLiveServerAddress,
  signalSupervisor,
  spawnSupervisor,
} from './server-process';

let home: string;

const writeServerJson = (pid: number) => {
  const address = {
    pid,
    port: 7337,
    version: '0.9.0',
    startedAt: '2026-10-03T09:00:00.000Z',
  };
  writeFileSync(join(home, 'server.json'), JSON.stringify(address));
  return address;
};

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'desktop-server-process-'));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

describe('readLiveServerAddress', () => {
  it('returns server.json of any version when its pid is alive', async () => {
    const address = writeServerJson(process.pid);

    expect(await readLiveServerAddress(home)).toEqual(address);
  });

  it('returns null when the pid in server.json has exited', async () => {
    const exited = spawnSync(process.execPath, ['--version']).pid;
    writeServerJson(exited);

    expect(await readLiveServerAddress(home)).toBeNull();
  });

  it('returns null without server.json', async () => {
    expect(await readLiveServerAddress(home)).toBeNull();
  });
});

describe('spawnSupervisor', () => {
  it('reports the pid before it returns, then the exit of a Supervisor that exits while it starts', async () => {
    // No src/main.ts here, so Node exits at once.
    const reports: string[] = [];
    let reportsOnReturn: string[] = [];
    const exited = new Promise<void>((resolve) => {
      spawnSupervisor(
        { home, serverDirectory: home },
        {
          spawned: (pid) => reports.push(`spawned ${typeof pid}`),
          exited: (reason) => {
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
      `The Supervisor exited while starting (1); see ${join(home, 'logs')}`,
    ]);
  });

  it('stops reporting once the returned function runs', async () => {
    const reports: string[] = [];
    let stopListening = () => {};
    const exited = new Promise<void>((resolve) => {
      stopListening = spawnSupervisor(
        { home, serverDirectory: home },
        {
          spawned: () => {},
          exited: (reason) => reports.push(reason),
        },
      );
      // Node exits within this wait, as it does in the test above.
      setTimeout(resolve, 2000);
    });
    stopListening();

    await exited;

    expect(reports).toEqual([]);
  });
});

describe('signalSupervisor', () => {
  it('does nothing for a pid that has exited', () => {
    const exited = spawnSync(process.execPath, ['--version']).pid;

    expect(() => signalSupervisor(exited)).not.toThrow();
  });
});
