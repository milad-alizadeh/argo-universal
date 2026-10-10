import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const gitCommand = 'git';

type Git = (...arguments_: string[]) => string;

function gitIn(directory: string): Git {
  return (...arguments_: string[]): string => {
    const result = spawnSync(gitCommand, arguments_, {
      cwd: directory,
      encoding: 'utf8',
    });
    if (result.status !== 0)
      throw new Error(`git ${arguments_.join(' ')}: ${result.stderr}`);
    return result.stdout.trim();
  };
}

function commitWith(git: Git, message: string): void {
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
}

function addFeatureBranch(git: Git): void {
  git('switch', '-q', '-c', 'feature');
  commitWith(git, 'Feature');
  git('switch', '-q', 'main');
}

// Makes `directory` a repository on `main` ("Initial"); with `featureBranch`, `feature` is one commit ("Feature") ahead. Returns a git runner there.
export function initTestRepository(
  directory: string,
  featureBranch = true,
): Git {
  mkdirSync(directory, { recursive: true });
  const git = gitIn(directory);
  git('init', '-q', '--initial-branch=main');
  commitWith(git, 'Initial');
  if (featureBranch) addFeatureBranch(git);
  return git;
}
