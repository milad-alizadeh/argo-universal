import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAlive } from '@repo/process';
import { expect, it, vi, onTestFinished } from 'vitest';
import { createActor, setup } from 'xstate';
import { z } from 'zod';
import { engineProcess } from './engine-process';

const owners = [
  {
    kind: 'Shell',
    entry: fileURLToPath(
      new URL('../../mocks/shell-engine.ts', import.meta.url),
    ),
    folderName: 'shell-processes',
  },
];

const changeProcesses = (
  mode: string,
  pids: { wrapper: number; engine: number },
): void => {
  if (mode === 'stopped wrapper') process.kill(pids.wrapper, 'SIGSTOP');

  if (mode !== 'Supervisor force-stop') process.kill(pids.engine, 'SIGKILL');
};

it.each(
  owners.flatMap((owner) =>
    ['abrupt Engine exit', 'Supervisor force-stop', 'stopped wrapper'].map(
      (mode) => ({ ...owner, mode }),
    ),
  ),
)(
  'releases the real $kind after $mode',
  async ({ entry, folderName, mode }) => {
    const folder = await mkdtemp(join(tmpdir(), 'argo-shell-supervisor-'));
    vi.stubEnv('ARGO_HOME', folder);
    vi.stubEnv('ARGO_FIXTURE_PIDFILE', join(folder, 'pids.json'));
    const events: string[] = [];

    const parent = setup({ actors: { engine: engineProcess } }).createMachine({
      invoke: {
        id: 'engine',
        src: 'engine',
        input: { watch: false, entry, killTimeoutMs: 100 },
      },
      on: {
        '*': {
          actions: ({ event }) => {
            events.push(event.type);
          },
        },
      },
    });

    const actor = createActor(parent).start();
    const owned: number[] = [];
    onTestFinished(async () => {
      actor.stop();

      for (const pid of owned) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {}
      }

      await rm(folder, { recursive: true, force: true });
      vi.unstubAllEnvs();
    });
    await expect
      .poll(() => events, { timeout: 20000 })
      .toContain('engine.ready');

    const pids = z
      .object({ engine: z.number(), command: z.number(), wrapper: z.number() })
      .parse(JSON.parse(await readFile(join(folder, 'pids.json'), 'utf8')));

    owned.push(pids.command, pids.wrapper);

    changeProcesses(mode, pids);
    const engine = actor.getSnapshot().children['engine'];

    if (!engine) throw new Error('Engine did not start');
    engine.send({ type: 'engine.stop' });
    await expect
      .poll(() => events, { timeout: 10000 })
      .toContain('engine.exited');
    expect([pids.command, pids.wrapper].map(isAlive)).toEqual([false, false]);
    expect(await readdir(join(folder, folderName))).toEqual([]);
  },
  30000,
);
