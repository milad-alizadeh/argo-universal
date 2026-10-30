import { execFile } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { promisify } from 'node:util';

const execute = promisify(execFile);

export type TestGit = (...arguments_: string[]) => Promise<string>;

const identity = ['-c', 'user.name=Test', '-c', 'user.email=test@example.com'];

// Runs git in `directory`, returning its trimmed output.
export function gitIn(directory: string): TestGit {
  return async (...arguments_: string[]): Promise<string> =>
    (await execute('git', arguments_, { cwd: directory })).stdout.trim();
}

export async function commit(git: TestGit, message: string): Promise<void> {
  await git(...identity, 'commit', '-q', '--allow-empty', '-m', message);
}

async function addFeatureBranch(git: TestGit): Promise<void> {
  await git('switch', '-q', '-c', 'feature');
  await commit(git, 'Feature');
  await git('switch', '-q', 'main');
}

// A repository on `main` ("Initial"); with `featureBranch`, `feature` is one commit ("Feature") ahead.
export async function initTestRepository(
  directory: string,
  featureBranch = true,
): Promise<TestGit> {
  mkdirSync(directory, { recursive: true });
  const git = gitIn(directory);

  await git('init', '-q', '--initial-branch=main');
  await commit(git, 'Initial');

  if (featureBranch) await addFeatureBranch(git);

  return git;
}
