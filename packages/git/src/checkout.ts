import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { discardWorktree } from './checkout-removal';
import { git } from './git';
import {
  listBranches,
  readMainCheckout,
  type Checkout,
  type CheckoutChoice,
} from './repository';

export { discardCheckout, removeCheckout } from './checkout-removal';

const sessionBranchPrefix = 'argo/';

// The prefix is stored data and must survive a product rename.
export const sessionBranch = (id: string): string =>
  `${sessionBranchPrefix}${id}`;

export const isSessionBranch = (branch: string | null, id: string): boolean =>
  branch === sessionBranch(id);

type CheckoutInput = {
  projectPath: string;
  projectId: string;
  sessionId: string;
  choice: CheckoutChoice;
  runtimeDirectory: string;
};

type WorktreeInput = CheckoutInput & {
  choice: Extract<CheckoutChoice, { type: 'worktree' }>;
};

// The Project may have been registered through any of its working trees.
export async function createCheckout(
  input: CheckoutInput,
  signal?: AbortSignal,
): Promise<Checkout> {
  const main = readMainCheckout(
    await git(
      input.projectPath,
      ['worktree', 'list', '--porcelain', '-z'],
      signal,
    ),
  );

  if (input.choice.type === 'main') return main;

  return createWorktree({ ...input, choice: input.choice }, signal);
}

function checkoutPath(input: WorktreeInput): string {
  for (const segment of [input.projectId, input.sessionId])
    if (!/^[a-zA-Z0-9_-]+$/.test(segment))
      throw new Error('Invalid Checkout path segment');

  return join(
    input.runtimeDirectory,
    'worktrees',
    input.projectId,
    input.sessionId,
  );
}

async function createWorktree(
  input: WorktreeInput,
  signal?: AbortSignal,
): Promise<Checkout> {
  const checkout = {
    path: checkoutPath(input),
    branch: sessionBranch(input.sessionId),
  };

  await mkdir(dirname(checkout.path), { recursive: true });

  const existing = await existingCheckout(input.projectPath, checkout, signal);

  signal?.throwIfAborted();

  await addWorktree(input, checkout, existing);

  return checkout;
}

type Existing = {
  signal: AbortSignal | undefined;
  checkoutExists: boolean;
  branchExists: boolean;
};

async function existingCheckout(
  projectPath: string,
  checkout: Checkout,
  signal: AbortSignal | undefined,
): Promise<Existing> {
  return {
    signal,
    checkoutExists: existsSync(checkout.path),
    branchExists: (await listBranches(projectPath, signal)).branches.includes(
      checkout.branch ?? '',
    ),
  };
}

function shouldClean(existing: Existing): boolean {
  return (
    isAborted(existing.signal) &&
    !existing.checkoutExists &&
    !existing.branchExists
  );
}

function isAborted(signal: AbortSignal | undefined): boolean {
  return Boolean(signal?.aborted);
}

async function runAdd(
  input: WorktreeInput,
  checkout: Checkout,
  signal?: AbortSignal,
): Promise<void> {
  await git(input.projectPath, addArguments(input, checkout), signal);
}

// A full ref keeps the base a local branch, and never an option.
function addArguments(input: WorktreeInput, checkout: Checkout): string[] {
  return [
    'worktree',
    'add',
    '-b',
    checkout.branch ?? '',
    checkout.path,
    `refs/heads/${input.choice.baseBranch}`,
  ];
}

async function cleanupAborted(
  input: WorktreeInput,
  checkout: Checkout,
): Promise<void> {
  await discardWorktree(input.projectPath, checkout, {
    signal: new AbortController().signal,
    force: true,
  });
}

async function addWorktree(
  input: WorktreeInput,
  checkout: Checkout,
  existing: Existing,
): Promise<void> {
  try {
    await runAdd(input, checkout, existing.signal);
  } catch (error) {
    if (shouldClean(existing)) await cleanupAborted(input, checkout);

    throw error;
  }
}
