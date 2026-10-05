import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { createActor, fromPromise } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { storedMessage } from '#mocks/feed';
import { toFeedRowWrite } from '../feed/feed-row';
import { writerMachine } from '../feed/writer-machine';
import { createSession, loadSession } from './session-data';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

it.each(['main', 'worktree'] as const)(
  'creates and reloads a Session in the %s Checkout with a line break in its path',
  async (checkout) => {
    const directory = realpathSync(
      mkdtempSync(join(tmpdir(), 'session-checkout-\n')),
    );
    cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
    const git = (...arguments_: string[]) =>
      execFileSync('git', arguments_, {
        cwd: directory,
        encoding: 'utf8',
      }).trim();
    git('init', '--initial-branch=main');
    git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '--allow-empty',
      '-m',
      'Initial',
    );
    const { database, remove } = openTestDatabase({}, directory);
    cleanups.push(remove);
    const created = await createSession({
      database,
      runtimeDirectory: join(directory, '.argo'),
      sessionId: 'new-session',
      kind: 'new',
      projectId: 'project-1',
      agent: 'mock',
      checkout,
    });
    expect(
      await loadSession({
        database,
        sessionId: 'new-session',
        kind: 'existing',
      }),
    ).toEqual(created);
    expect(created).toMatchObject({
      sessionId: 'new-session',
      vendorSessionId: null,
      epoch: 0,
      maxRevision: 0,
      nextPosition: 0,
      checkout: { branch: checkout === 'main' ? 'main' : 'argo/new-session' },
    });
    expect(
      execFileSync('git', ['branch', '--show-current'], {
        cwd: created.checkout.path,
        encoding: 'utf8',
      }).trim(),
    ).toBe(created.checkout.branch);
    expect(created.checkout.path).toBe(
      checkout === 'main'
        ? directory
        : join(directory, '.argo/worktrees/project-1/new-session'),
    );
  },
);

it('reloads Feed positions and the vendor Session from writes still queued', async () => {
  const { database, remove } = openTestDatabase();
  cleanups.push(remove);
  const writer = createActor(
    writerMachine.provide({
      actors: { writeBatch: fromPromise(() => new Promise(() => {})) },
    }),
    { input: { database } },
  ).start();
  cleanups.push(() => writer.stop());
  writer.send({
    type: 'writer.write',
    job: {
      type: 'sessionRowUpdate',
      id: 'session-1',
      set: { vendorSessionId: 'vendor-resume' },
    },
  });
  writer.send({
    type: 'writer.write',
    job: {
      type: 'feedRows',
      sessionId: 'session-1',
      maxRevision: 12,
      rows: [toFeedRowWrite(storedMessage(4, 12))],
    },
  });
  expect(
    await loadSession(
      { database, sessionId: 'session-1', kind: 'existing' },
      writer,
    ),
  ).toMatchObject({
    vendorSessionId: 'vendor-resume',
    maxRevision: 12,
    nextPosition: 5,
  });
});

it('rejects an unknown Session or Project', async () => {
  const { database, remove } = openTestDatabase();
  cleanups.push(remove);
  await expect(
    loadSession({ database, sessionId: 'missing', kind: 'existing' }),
  ).rejects.toThrow('No Session missing');
  await expect(
    createSession({
      database,
      sessionId: 'new-session',
      kind: 'new',
      projectId: 'missing',
      agent: 'mock',
      checkout: 'main',
    }),
  ).rejects.toThrow('No Project missing');
});

it('rejects and reports a git response that has no working Checkout', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'session-bare-'));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  execFileSync('git', ['init', '--bare', directory]);
  const { database, remove } = openTestDatabase({}, directory);
  cleanups.push(remove);
  const report = vi.spyOn(console, 'error').mockImplementation(() => {});
  cleanups.push(() => report.mockRestore());
  await expect(
    createSession({
      database,
      kind: 'new',
      projectId: 'project-1',
      sessionId: 'new-session',
      agent: 'mock',
      checkout: 'main',
    }),
  ).rejects.toThrow('Unrecognised git worktree list response');
  expect(report).toHaveBeenCalledWith(
    expect.stringContaining(
      'git: rejected worktree list response (1 rejected)',
    ),
  );
});
