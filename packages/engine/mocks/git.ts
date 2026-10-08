import { execFileSync } from 'node:child_process';

// Makes `directory` a repository on `main` ("Initial") whose `feature` branch is one commit ("Feature") ahead; returns a git runner there.
export function initTestRepository(
  directory: string,
): (...arguments_: string[]) => string {
  const git = (...arguments_: string[]): string =>
    execFileSync('git', arguments_, {
      cwd: directory,
      encoding: 'utf8',
    }).trim();
  const commit = (message: string): string =>
    git(
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
  git('init', '-q', '--initial-branch=main');
  commit('Initial');
  git('switch', '-q', '-c', 'feature');
  commit('Feature');
  git('switch', '-q', 'main');
  return git;
}
