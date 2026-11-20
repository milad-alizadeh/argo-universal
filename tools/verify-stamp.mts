// The last tree whose format, lint and type checks passed, so before-stop does not run them again on it (docs/agents/hooks.md).
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root, run } from './hook-checks.mts';

const git = (args: string[]): string => run('git', args).output;

const untrackedStamp = (file: string): string => {
  try {
    return `${file} ${statSync(path.join(root, file)).mtimeMs}`;
  } catch {
    return file;
  }
};

// HEAD, every change against it, and each untracked file's path and modification time.
export function treeFingerprint(): string {
  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z'])
    .split('\0')
    .filter(Boolean)
    .map(untrackedStamp);

  return createHash('sha256')
    .update(git(['rev-parse', 'HEAD']))
    .update('\0')
    .update(git(['diff', 'HEAD', '--binary']))
    .update('\0')
    .update(untracked.join('\n'))
    .digest('hex');
}

// In .git, per worktree, so it is never committed and each worktree keeps its own.
const stampPath = (): string =>
  path.resolve(
    root,
    git(['rev-parse', '--git-path', 'argo-checks-passed']).trim(),
  );

// Written by `pnpm verify` and by before-stop once their checks pass.
export function recordPassed(): void {
  writeFileSync(stampPath(), treeFingerprint());
}

export function passedAlready(): boolean {
  try {
    return readFileSync(stampPath(), 'utf8') === treeFingerprint();
  } catch {
    return false;
  }
}
