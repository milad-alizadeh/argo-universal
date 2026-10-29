import { existsSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { project, session } from '@repo/db/schema';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { eq } from 'drizzle-orm';
import { afterEach, expect, it } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { writeJobs } from '../../storage';
import {
  createSessionCheckout,
  discardSession,
  loadSession,
  toSessionInsert,
} from '../session-data';

const newSessionId = 'new-session';

const cleanups: (() => void)[] = [];

const newSession = {
  kind: 'new' as const,
  sessionId: newSessionId,
  turnId: 'turn-1',
  projectId: 'project-1',
  agent: 'mock',
  configOptions: [{ configId: 'model', value: 'large' }],
  prompt: [{ type: 'text' as const, text: 'Build it' }],
};

afterEach((): void => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

function checkoutExpectations(
  type: 'main' | 'worktree',
  directory: string,
): { branch: string; commit: string; path: string } {
  return type === 'main'
    ? { branch: 'main', commit: 'Initial', path: directory }
    : {
        branch: 'argo/new-session',
        commit: 'Feature',
        path: join(directory, '.argo/worktrees/project-1/new-session'),
      };
}

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
    const expected = checkoutExpectations(checkout.type, directory);
    const git = await initTestRepository(directory);

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
    ).toEqual({ ...created, vendorSessionId: 'vendor-1', kept: true });
    expect(created).toMatchObject({
      kept: false,
      sessionId: newSessionId,
      vendorSessionId: null,
      epoch: 0,
      maxRevision: 0,
      nextPosition: 0,
      checkout: {
        branch: expected.branch,
      },
    });
    expect(readStoredSession()).toMatchObject({
      title: 'Build it',
      titleSource: 'prompt',
    });
    expect(
      database.select().from(project).where(eq(project.id, 'project-1')).get(),
    ).toMatchObject({ checkoutChoice: checkout });

    const checkoutGit = (...arguments_: string[]): Promise<string> =>
      git('-C', created.checkout.path, ...arguments_);

    expect(await checkoutGit('branch', '--show-current')).toBe(
      created.checkout.branch,
    );
    expect(await checkoutGit('log', '-1', '--format=%s')).toBe(expected.commit);
    expect(created.checkout.path).toBe(expected.path);
    await discardSession({
      input,
      data: created,
      stored: false,
      writer: undefined,
    });
    expect(existsSync(created.checkout.path)).toBe(checkout.type === 'main');
    expect(await git('branch', '--list', 'argo/*')).toBe('');
  },
);
