import { existsSync } from 'node:fs';
import { realpath, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { git } from './git';
import { listBranches, readMainCheckout, type Checkout } from './repository';

// Removes a worktree that no Turn ran in, with its new branch.
export async function discardCheckout(
  projectPath: string,
  checkout: Checkout,
  signal?: AbortSignal,
): Promise<void> {
  await discardWorktree(projectPath, checkout, { signal, force: false });
}

export async function discardWorktree(
  projectPath: string,
  checkout: Checkout,
  options: { signal: AbortSignal | undefined; force: boolean },
): Promise<void> {
  if (existsSync(checkout.path))
    await removeWorktree(projectPath, checkout.path, options);

  await deleteBranch(projectPath, checkout.branch, options.signal);
}

async function removeWorktree(
  projectPath: string,
  path: string,
  options: { signal: AbortSignal | undefined; force: boolean },
): Promise<void> {
  const flags = options.force ? ['--force', '--force'] : [];

  await git(
    projectPath,
    ['worktree', 'remove', ...flags, path],
    options.signal,
  );
}

async function deleteBranch(
  projectPath: string,
  branch: string | null,
  signal?: AbortSignal,
): Promise<void> {
  if (!branch) return;

  if ((await listBranches(projectPath, signal)).branches.includes(branch))
    await git(projectPath, ['branch', '-D', branch], signal);
}

const listWorktrees = (
  projectPath: string,
  signal?: AbortSignal,
): Promise<string> =>
  git(projectPath, ['worktree', 'list', '--porcelain', '-z'], signal);

async function isMainCheckout(
  projectPath: string,
  checkout: Checkout,
  signal?: AbortSignal,
): Promise<boolean> {
  const main = readMainCheckout(await listWorktrees(projectPath, signal));

  return (await realpath(main.path)) === (await realpath(checkout.path));
}

const isListed = (worktrees: string, path: string): boolean =>
  worktrees.split('\0').includes(`worktree ${path}`);

// An interrupted `git worktree remove` can leave files with no `.git` that Git no longer lists.
const isRemovalLeftover = (worktrees: string, path: string): boolean =>
  !isListed(worktrees, path) && !existsSync(join(path, '.git'));

async function removeLinkedCheckout(
  projectPath: string,
  path: string,
  signal?: AbortSignal,
): Promise<void> {
  if (isRemovalLeftover(await listWorktrees(projectPath, signal), path)) {
    await rm(path, { recursive: true, force: true });

    return;
  }

  await git(projectPath, ['worktree', 'remove', '--force', path], signal);
}

// Archive keeps the branch, and Git's actual main Checkout is always protected.
export async function removeCheckout(
  projectPath: string,
  checkout: Checkout,
  signal?: AbortSignal,
): Promise<void> {
  if (!existsSync(checkout.path)) return;

  if (await isMainCheckout(projectPath, checkout, signal)) return;

  await removeLinkedCheckout(projectPath, checkout.path, signal);
}
