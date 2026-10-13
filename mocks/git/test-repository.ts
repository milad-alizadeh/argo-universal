import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { promisify } from 'node:util';

const execute = promisify(execFile);

type Git = (...arguments_: string[]) => Promise<string>;

function gitIn(directory: string): Git {
  return async (...arguments_: string[]): Promise<string> =>
    (await execute('git', arguments_, { cwd: directory })).stdout.trim();
}

async function commitWith(git: Git, message: string): Promise<void> {
  await git(
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@example.com',
    'commit',
    '-q',
    '--allow-empty',
    '-m',
    message,
  );
}

async function addFeatureBranch(git: Git): Promise<void> {
  await git('switch', '-q', '-c', 'feature');
  await commitWith(git, 'Feature');
  await git('switch', '-q', 'main');
}

// Makes `directory` a repository on `main` ("Initial"); with `featureBranch`, `feature` is one commit ("Feature") ahead. Returns a git runner there.
export async function initTestRepository(
  directory: string,
  featureBranch = true,
): Promise<Git> {
  await mkdir(directory, { recursive: true });
  const git = gitIn(directory);
  await git('init', '-q', '--initial-branch=main');
  await commitWith(git, 'Initial');

  if (featureBranch) await addFeatureBranch(git);

  return git;
}

const lines = (output: string): string[] => output.split('\n').filter(Boolean);

// The Session branches and worktrees a test repository holds, to see what a Session left behind.
export async function readSessionCheckouts(
  directory: string,
): Promise<{ branches: string[]; worktrees: number }> {
  const git = gitIn(directory);
  const branchList = ['--list', '--format=%(refname:short)', 'argo/*'];
  const branches = lines(await git('branch', ...branchList));
  const worktrees = lines(await git('worktree', 'list', '--porcelain'));

  return {
    branches,
    worktrees: worktrees.filter((line) => line.startsWith('worktree ')).length,
  };
}
