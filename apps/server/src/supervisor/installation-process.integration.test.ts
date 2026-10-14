import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseInstallationProcessGroups } from '@repo/engine/installation-runtime';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createActor, setup } from 'xstate';
import { z } from 'zod';
import { engineProcess } from './engine-process';

let folder: string;

let events: string[];

let fixtureGroup: number | undefined;

let stop = (): void => {};

const entry = fileURLToPath(
  new URL('../../mocks/installing-engine.ts', import.meta.url),
);

const recordPath = (): string =>
  join(
    folder,
    'agents',
    'scope',
    '.install-operation',
    '.installer-group.json',
  );

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

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
};

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'argo-installer-supervisor-'));
  events = [];
  fixtureGroup = undefined;
  vi.stubEnv('ARGO_HOME', folder);
  vi.stubEnv('ARGO_FIXTURE_PIDFILE', join(folder, 'pids.json'));
});

afterEach(async () => {
  stop();

  if (fixtureGroup) {
    try {
      process.kill(-fixtureGroup, 'SIGKILL');
    } catch {}
  }

  await releaseInstallationProcessGroups(folder);
  await rm(folder, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

it.each([
  'abrupt Engine exit',
  'Supervisor force-stop',
  'stopped installer wrapper',
  'Engine exits during cancellation',
])(
  'observes the real installer and descendant exit after %s',
  async (mode) => {
    if (mode === 'Engine exits during cancellation')
      vi.stubEnv('ARGO_FIXTURE_CANCEL_INSTALL', '1');
    const actor = createActor(parent).start();
    stop = (): void => {
      actor.stop();
    };

    await expect
      .poll(() => events, { timeout: 10000 })
      .toContain('engine.ready');

    const pids = z
      .object({
        engine: z.number(),
        installer: z.number(),
        descendant: z.number(),
      })
      .parse(JSON.parse(await readFile(join(folder, 'pids.json'), 'utf8')));

    fixtureGroup = z
      .object({ pid: z.number() })
      .parse(JSON.parse(await readFile(recordPath(), 'utf8'))).pid;

    if (mode === 'stopped installer wrapper') {
      process.kill(fixtureGroup, 'SIGSTOP');
      process.kill(pids.engine, 'SIGKILL');
    }

    if (mode === 'abrupt Engine exit') process.kill(pids.engine, 'SIGKILL');
    const engine = actor.getSnapshot().children['engine'];

    if (!engine) throw new Error('Engine did not start');
    engine.send({ type: 'engine.stop' });
    await expect
      .poll(() => events, { timeout: 10000 })
      .toContain('engine.exited');
    expect([pids.installer, pids.descendant].map(isAlive)).toEqual([
      false,
      false,
    ]);
    await expect(readFile(recordPath())).rejects.toMatchObject({
      code: 'ENOENT',
    });
  },
  20000,
);
