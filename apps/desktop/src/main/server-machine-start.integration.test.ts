import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ServerAddress } from '@repo/contracts';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createActor, fromCallback, fromPromise, waitFor } from 'xstate';
import { serverConnectionMachine } from './server-machine';

let home: string;

const electronVersion = process.versions.electron;

// The real Supervisor start, under Electron with no Node in PATH; no Server is ever found.
const machine = serverConnectionMachine.provide({
  actors: {
    watchCounts: fromCallback(() => {}),
    readAddress: fromPromise(async (): Promise<ServerAddress | null> => null),
  },
  actions: { log: (): void => {} },
});

beforeEach((): void => {
  home = mkdtempSync(join(tmpdir(), 'desktop-server-start-'));
  vi.stubEnv('PATH', home);
  Object.assign(process.versions, { electron: '0.0.0' });
});

afterEach((): void => {
  Object.assign(process.versions, { electron: electronVersion });
  vi.unstubAllEnvs();
  rmSync(home, { recursive: true, force: true });
});

it('a Supervisor that cannot start offers Retry, with the reason', async () => {
  const server = createActor(machine, {
    input: { home, cliDirectory: home, askToKeepSessions: async () => false },
  });

  server.start();

  const failed = await waitFor(server, (snapshot) =>
    snapshot.matches('failed'),
  );

  expect(failed.context.failure).toBe('Executable not found in PATH: node');
  expect(failed.can({ type: 'server.retry' })).toBe(true);
  server.stop();
});
