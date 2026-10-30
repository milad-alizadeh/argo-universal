import { git } from '../git';

// A path is a name, never a glob or a pathspec magic.
const literalPathspecs = '--literal-pathspecs';

// Every changed path against the base, renames paired, as `git diff --name-status -z` prints them.
export const readNameStatus = (
  checkout: string,
  base: string,
): Promise<string> =>
  git(checkout, ['diff', '--name-status', '-z', '-M', base]);

// Line counts against the base, for every path or for the given ones.
export const readNumstat = (
  checkout: string,
  base: string,
  paths: string[] = [],
): Promise<string> =>
  git(checkout, [
    literalPathspecs,
    'diff',
    '--numstat',
    '-z',
    '-M',
    base,
    '--',
    ...paths,
  ]);

export const readPatch = (
  checkout: string,
  base: string,
  paths: string[],
): Promise<string> =>
  git(checkout, [literalPathspecs, 'diff', '-M', base, '--', ...paths]);

// The working tree's state, untracked files listed one by one; one path's, or all.
export const readWorktree = (
  checkout: string,
  paths: string[] = [],
): Promise<string> =>
  git(checkout, [
    literalPathspecs,
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
    '--',
    ...paths,
  ]);
