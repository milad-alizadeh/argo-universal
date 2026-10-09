import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SessionNewInput } from '@repo/contracts';
import { project, session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { afterEach, expect, it, vi } from 'vitest';
import { createActor, fromPromise } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { storedMessage } from '#mocks/feed';
import { initTestRepository } from '#mocks/git';
import { writeJobs } from '../feed';
import { writerMachine } from '../feed';
import {
  createSessionCheckout,
  discardSessionCheckout,
  loadSession,
  titleFromPrompt,
  toSessionInsert,
} from './session-data';

const newSessionId = 'new-session';

const cleanups: (() => void)[] = [];
afterEach((): void => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

const newSession = {
  kind: 'new' as const,
  sessionId: newSessionId,
  turnId: 'turn-1',
  projectId: 'project-1',
  agent: 'mock',
  configOptions: [{ configId: 'model', value: 'large' }],
  prompt: [{ type: 'text' as const, text: 'Build it' }],
};

it.each([
  { type: 'main' },
  { type: 'worktree', baseBranch: 'feature' },
] as const)(
  'creates the $type Checkout from the Project path supplied at creation',
  async (checkout): Promise<void> => {
    const directory = realpathSync(
      mkdtempSync(join(tmpdir(), 'session-project-path-')),
    );
    cleanups.push((): void =>
      rmSync(directory, { recursive: true, force: true }),
    );
    initTestRepository(directory);
    const { database, remove } = openTestDatabase(
      {},
      join(directory, 'stale-project-path'),
    );
    cleanups.push(remove);
    const created = await createSessionCheckout({
      ...newSession,
      database,
      runtimeDirectory: join(directory, '.argo'),
      projectPath: directory,
      checkout,
    });
    expect(created.checkout.path).toBe(
      checkout.type === 'main'
        ? directory
        : join(directory, '.argo/worktrees/project-1/new-session'),
    );
  },
);

it.each([
  { type: 'main' },
  { type: 'worktree', baseBranch: 'feature' },
] as const)(
  'creates, stores and reloads a Session in the $type Checkout with a line break in its path',
  async (checkout): Promise<void> => {
    const directory = realpathSync(
      mkdtempSync(join(tmpdir(), 'session-checkout-\n')),
    );
    cleanups.push((): void =>
      rmSync(directory, { recursive: true, force: true }),
    );
    const git = initTestRepository(directory);
    const {
      database,
      directory: runtimeDirectory,
      remove,
    } = openTestDatabase({}, directory);
    cleanups.push(remove);
    const input = {
      ...newSession,
      database,
      projectPath: directory,
      runtimeDirectory: join(directory, '.argo'),
      checkout,
    };
    const readStoredSession = (): typeof session.$inferSelect | undefined =>
      database.select().from(session).where(eq(session.id, newSessionId)).get();
    const created = await createSessionCheckout(input);
    expect(readStoredSession()).toBeUndefined();
    writeJobs(database, [
      toSessionInsert(input, { ...created, vendorSessionId: 'vendor-1' }),
    ]);
    expect(
      await loadSession({
        database,
        runtimeDirectory,
        sessionId: newSessionId,
        kind: 'existing',
      }),
    ).toEqual({ ...created, vendorSessionId: 'vendor-1' });
    expect(created).toMatchObject({
      sessionId: newSessionId,
      vendorSessionId: null,
      epoch: 0,
      maxRevision: 0,
      nextPosition: 0,
      checkout: {
        branch: checkout.type === 'main' ? 'main' : 'argo/new-session',
      },
    });
    expect(readStoredSession()).toMatchObject({
      title: 'Build it',
      titleSource: 'prompt',
    });
    expect(
      database.select().from(project).where(eq(project.id, 'project-1')).get(),
    ).toMatchObject({ checkoutChoice: checkout });
    const checkoutGit = (...arguments_: string[]): string =>
      git('-C', created.checkout.path, ...arguments_);
    expect(checkoutGit('branch', '--show-current')).toBe(
      created.checkout.branch,
    );
    expect(checkoutGit('log', '-1', '--format=%s')).toBe(
      checkout.type === 'main' ? 'Initial' : 'Feature',
    );
    expect(created.checkout.path).toBe(
      checkout.type === 'main'
        ? directory
        : join(directory, '.argo/worktrees/project-1/new-session'),
    );
    await discardSessionCheckout(input, created.checkout);
    expect(existsSync(created.checkout.path)).toBe(checkout.type === 'main');
    expect(git('branch', '--list', 'argo/*')).toBe('');
  },
);

it.each([
  [
    [{ type: 'text', text: '  \n  Fix the build\nThen test it' }],
    'Fix the build',
  ],
  [
    [
      { type: 'text', text: 'One line' },
      { type: 'text', text: 'Two' },
    ],
    'One line',
  ],
  [
    [
      {
        type: 'image',
        mimeType: 'image/png',
        blob: { blobId: 'image-1', mime: 'image/png', bytes: 3 },
      },
      { type: 'text', text: 'What is this?' },
    ],
    'What is this?',
  ],
  [[], ''],
] satisfies [SessionNewInput['prompt'], string][])(
  'titles the prompt %j as %j',
  (prompt, title): void => {
    expect(titleFromPrompt(prompt)).toBe(title);
  },
);

it('reloads Feed positions and the vendor Session from writes still queued', async (): Promise<void> => {
  const { database, directory: runtimeDirectory, remove } = openTestDatabase();
  cleanups.push(remove);
  const writer = createActor(
    writerMachine.provide({
      actors: {
        writeBatch: fromPromise(
          (): Promise<void> => new Promise((): void => {}),
        ),
      },
    }),
    {
      input: {
        now: (): number => Date.now(),
        database,
      },
    },
  ).start();
  cleanups.push((): typeof writer => writer.stop());
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
      rows: [storedMessage(4, 12)],
    },
  });
  expect(
    await loadSession(
      { database, runtimeDirectory, sessionId: 'session-1', kind: 'existing' },
      writer,
    ),
  ).toMatchObject({
    vendorSessionId: 'vendor-resume',
    maxRevision: 12,
    nextPosition: 5,
  });
});

it('rejects an unknown Session', async (): Promise<void> => {
  const { database, directory: runtimeDirectory, remove } = openTestDatabase();
  cleanups.push(remove);
  await expect(
    loadSession({
      database,
      runtimeDirectory,
      sessionId: 'missing',
      kind: 'existing',
    }),
  ).rejects.toThrow('No Session missing');
});

it('rejects and reports a git response that has no working Checkout', async (): Promise<void> => {
  const directory = mkdtempSync(join(tmpdir(), 'session-bare-'));
  cleanups.push((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  execFileSync('git', ['init', '--bare', directory]);
  const {
    database,
    directory: runtimeDirectory,
    remove,
  } = openTestDatabase({}, directory);
  cleanups.push(remove);
  const report = vi.spyOn(console, 'error').mockImplementation((): void => {});
  await expect(
    createSessionCheckout({
      ...newSession,
      database,
      runtimeDirectory,
      projectPath: directory,
      checkout: { type: 'main' },
    }),
  ).rejects.toThrow('Unrecognised git worktree list response');
  expect(report).toHaveBeenCalledWith(
    expect.stringContaining(
      'git: rejected worktree list response (1 rejected)',
    ),
  );
});
