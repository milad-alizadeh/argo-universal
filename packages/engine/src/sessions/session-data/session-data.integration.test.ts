import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { afterEach, expect, it } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { createSessionCheckout } from '../session-data';

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
    await initTestRepository(directory);

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
