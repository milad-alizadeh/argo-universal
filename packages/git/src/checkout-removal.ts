import { existsSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { listBranches, readMainCheckout, type Checkout } from './repository';
import { run } from './run';

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

  await run(
    ['-C', projectPath, 'worktree', 'remove', ...flags, path],
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
    await run(['-C', projectPath, 'branch', '-D', branch], signal);
}

async function isMainCheckout(
  projectPath: string,
  checkout: Checkout,
  signal?: AbortSignal,
): Promise<boolean> {
  const { stdout } = await run(
    ['-C', projectPath, 'worktree', 'list', '--porcelain', '-z'],
    signal,
  );

  const main = readMainCheckout(stdout);

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
  await run(
    ['-C', projectPath, 'worktree', 'remove', '--force', checkout.path],
    signal,
  );
}
