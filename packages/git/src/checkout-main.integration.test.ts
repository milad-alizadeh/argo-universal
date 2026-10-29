import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { createCheckout } from './index';
import { initTestRepository } from './test-git.test.mocks';

const mainChoice = (
  projectPath: string,
): Parameters<typeof createCheckout>[0] => ({
  projectPath,
  projectId: 'project',
  sessionId: 'main-choice',
  choice: { type: 'main' },
  runtimeDirectory: join(projectPath, 'runtime'),
});

it('runs a main choice in the main Checkout when the Project is a linked worktree', async (): Promise<void> => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'checkout-main-')));

  onTestFinished((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  const git = await initTestRepository(directory);
  const linked = join(directory, 'linked');

  await git('worktree', 'add', '-q', '-b', 'linked', linked, 'main');

  expect(await createCheckout(mainChoice(linked))).toEqual({
    path: directory,
    branch: 'main',
  });
});

it('reports no branch for a main Checkout on a detached HEAD', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'checkout-detached-')),
  );

  onTestFinished((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  const git = await initTestRepository(directory);

  await git('switch', '-q', '--detach', 'main');

  expect(await createCheckout(mainChoice(directory))).toEqual({
    path: directory,
    branch: null,
  });
});
