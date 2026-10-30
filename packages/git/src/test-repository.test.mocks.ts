import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { onTestFinished } from 'vitest';
import { initTestRepository, type TestGit } from './test-git.test.mocks';

const sessionBranch = 'argo/session-1';

export const remoteFeatureRef = 'refs/remotes/origin/feature';

// A temporary repository, removed when the test finishes.
export async function repository(
  feature = true,
): Promise<{ directory: string; git: TestGit }> {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'argo-git-')));

  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));

  return { directory, git: await initTestRepository(directory, feature) };
}

// The Session's worktree, on its own branch cut from `base`.
export async function sessionWorktree(
  directory: string,
  git: TestGit,
  base = 'feature',
): Promise<string> {
  const checkout = join(directory, 'session');

  await git('worktree', 'add', '-q', '-b', sessionBranch, checkout, base);

  return checkout;
}
