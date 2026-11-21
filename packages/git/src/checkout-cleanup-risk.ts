import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { lstat, readlink, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { readWorktree } from './changes';
import { git } from './git';
import { readMainCheckout } from './repository';

export type CheckoutCleanupRisk =
  | { kind: 'absent' | 'safe' | 'uncertain' }
  | { kind: 'loss'; fingerprint: string; reason: string };

async function belongsToProject(
  projectPath: string,
  path: string,
): Promise<boolean> {
  const worktrees = await git(projectPath, [
    'worktree',
    'list',
    '--porcelain',
    '-z',
  ]);

  const main = await realpath(readMainCheckout(worktrees).path);

  return path !== main && worktrees.split('\0').includes(`worktree ${path}`);
}

async function untrackedFile(path: string, file: string): Promise<string> {
  const absolute = join(path, file);
  const entry = await lstat(absolute);

  if (entry.isSymbolicLink()) return readlink(absolute);

  if (!entry.isFile()) throw new Error('Untracked entry is not a regular file');

  return git(path, ['hash-object', '--no-filters', '--', file]);
}

async function dirtyFingerprint(path: string): Promise<string[]> {
  const patch = ['--binary', '--no-ext-diff', '--no-textconv'];

  const [unstaged, staged, untracked] = await Promise.all([
    git(path, ['diff', ...patch]),
    git(path, ['diff', '--cached', ...patch]),
    git(path, ['ls-files', '--others', '--exclude-standard', '-z']),
  ]);

  const files: string[] = [];

  for (const file of untracked.split('\0').filter(Boolean))
    files.push(await untrackedFile(path, file));

  return [unstaged, staged, untracked, ...files];
}

const unprotectedCommits = (path: string): Promise<string> =>
  git(path, ['rev-list', 'HEAD', '--not', '--branches', '--remotes', '--tags']);

function hiddenIndexEntries(index: string): boolean {
  return index.split('\0').some((line) => /^(?:[a-z]|S) /.test(line));
}

async function hasSubmodules(path: string): Promise<boolean> {
  const index = await git(path, ['ls-files', '--stage']);

  return index.split('\n').some((line) => line.startsWith('160000 '));
}

async function riskAt(path: string): Promise<CheckoutCleanupRisk> {
  const [status, unreachable, index] = await Promise.all([
    readWorktree(path),
    unprotectedCommits(path),
    git(path, ['ls-files', '-v', '-z']),
  ]);

  // Git can hide edits marked assume-unchanged or skip-worktree.
  if (hiddenIndexEntries(index)) return { kind: 'uncertain' };

  return unchanged(status, unreachable)
    ? { kind: 'safe' }
    : lossAt(path, status, unreachable);
}

const unchanged = (status: string, unreachable: string): boolean =>
  !status && !unreachable;

async function lossAt(
  path: string,
  status: string,
  unreachable: string,
): Promise<CheckoutCleanupRisk> {
  // Submodules can hold work Git's parent diff cannot describe.
  if (await hasSubmodules(path)) return { kind: 'uncertain' };

  const files = status ? await dirtyFingerprint(path) : [];

  const fingerprint = createHash('sha256')
    .update(JSON.stringify([path, status, unreachable, files]))
    .digest('hex');

  return { kind: 'loss', fingerprint, reason: lossReason(status) };
}

function lossReason(status: string): string {
  return status
    ? 'Removing this Checkout would discard uncommitted or untracked work.'
    : 'Removing this Checkout would leave commits unreachable.';
}

// Archive keeps branch refs. Detached work is safe only if another durable ref reaches it.
export async function checkoutCleanupRisk(
  projectPath: string,
  checkoutPath: string,
): Promise<CheckoutCleanupRisk> {
  if (!existsSync(checkoutPath)) return { kind: 'absent' };

  try {
    const path = await realpath(checkoutPath);

    return await projectRisk(projectPath, path);
  } catch {
    return { kind: 'uncertain' };
  }
}

async function projectRisk(
  projectPath: string,
  path: string,
): Promise<CheckoutCleanupRisk> {
  if (!(await belongsToProject(projectPath, path)))
    return { kind: 'uncertain' };

  return riskAt(path);
}
