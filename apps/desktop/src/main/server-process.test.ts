import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  readLiveServerAddress,
  signalServer,
  spawnServer,
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

describe('spawnServer', () => {
  it('reports the pid, then the exit, of a Server that exits while it starts', async () => {
    // No src/main.ts here, so Node exits at once.
    const reports: string[] = [];
    const exited = new Promise<void>((resolve) => {
      spawnServer(
        { home, serverDirectory: home },
        {
          spawned: (pid) => reports.push(`spawned ${typeof pid}`),
          exited: (reason) => {
            reports.push(reason);
            resolve();
          },
        },
      );
    });

    await exited;

    expect(reports).toEqual([
      'spawned number',
      expect.stringMatching(/^The Server exited while starting \(1\)/),
    ]);
  });
});

describe('signalServer', () => {
  it('does nothing for a pid that has exited', () => {
    const exited = spawnSync(process.execPath, ['--version']).pid;

    expect(() => signalServer(exited)).not.toThrow();
  });
});
