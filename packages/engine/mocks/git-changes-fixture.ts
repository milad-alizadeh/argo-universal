import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { onTestFinished } from 'vitest';

const sessionBranch = 'argo/session-1';

export const remoteFeatureRef = 'refs/remotes/origin/feature';

type Git = Awaited<ReturnType<typeof initTestRepository>>;

export async function repository(feature = true): Promise<{
  directory: string;
  git: Git;
}> {
  const directory = mkdtempSync(join(tmpdir(), 'argo-changes-'));

  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));

  return { directory, git: await initTestRepository(directory, feature) };
}

export async function sessionWorktree(
  directory: string,
  git: Git,
  base = 'feature',
): Promise<string> {
  const checkout = join(directory, 'session');

  await git('worktree', 'add', '-q', '-b', sessionBranch, checkout, base);

  return checkout;
}

export async function commit(git: Git, message: string): Promise<void> {
  await git(
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@example.com',
    'commit',
    '-q',
    '-m',
    message,
  );
}
