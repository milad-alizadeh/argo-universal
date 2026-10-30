import { existsSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
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

async function isMainCheckout(
  projectPath: string,
  checkout: Checkout,
  signal?: AbortSignal,
): Promise<boolean> {
  const main = readMainCheckout(
    await git(projectPath, ['worktree', 'list', '--porcelain', '-z'], signal),
  );

  return (await realpath(main.path)) === (await realpath(checkout.path));
}

// Archive keeps the branch, and Git's actual main Checkout is always protected.
export async function removeCheckout(
  projectPath: string,
  checkout: Checkout,
  signal?: AbortSignal,
): Promise<void> {
  if (!existsSync(checkout.path)) return;

  if (await isMainCheckout(projectPath, checkout, signal)) return;
  await git(
    projectPath,
    ['worktree', 'remove', '--force', checkout.path],
    signal,
  );
}
