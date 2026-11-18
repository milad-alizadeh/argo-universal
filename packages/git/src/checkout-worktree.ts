import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { discardWorktree } from './checkout-removal';
import { git } from './git';
import { listBranches, type Checkout, type CheckoutChoice } from './repository';
import { sessionBranch, worktreeName } from './session-branch';
import {
  resolveCheckoutBase,
  resolveTakenBranch,
  type TakenBranch,
} from './worktree-branch';

export type CheckoutInput = {
  projectPath: string;
  projectId: string;
  sessionId: string;
  choice: CheckoutChoice;
  runtimeDirectory: string;
  isOwned?: (path: string) => boolean;
};

export type WorktreeInput = CheckoutInput & {
  choice: Extract<CheckoutChoice, { type: 'worktree' }>;
};

function checkoutPath(input: WorktreeInput): string {
  for (const segment of [input.projectId, input.sessionId])
    if (!/^[a-zA-Z0-9_-]+$/.test(segment))
      throw new Error('Invalid Checkout path segment');

  return join(
    input.runtimeDirectory,
    'worktrees',
    input.projectId,
    worktreeName(input.sessionId),
  );
}

type WorktreeCheckout = Checkout & { branch: string };

type WorktreePlan = { checkout: WorktreeCheckout; base: string };

async function planWorktree(
  input: WorktreeInput,
  signal?: AbortSignal,
): Promise<WorktreePlan> {
  const checkout = {
    path: checkoutPath(input),
    branch: input.choice.branch ?? sessionBranch(input.sessionId),
  };

  const base = await resolveCheckoutBase(
    input.projectPath,
    input.choice.baseBranch,
    signal,
  );

  return { checkout, base };
}

async function validateRequestedBranch(
  input: WorktreeInput,
  signal?: AbortSignal,
): Promise<void> {
  if (input.choice.branch !== undefined)
    await git(
      input.projectPath,
      ['check-ref-format', `refs/heads/${input.choice.branch}`],
      signal,
    );
}

async function moveTakenWorktree(
  input: WorktreeInput,
  paths: { from: string; to: string },
  signal?: AbortSignal,
): Promise<void> {
  if (existsSync(paths.to))
    throw new Error(`The Session Checkout path already exists at ${paths.to}.`);

  // Relocating the worktree keeps the existing tip and makes the path change a single Git operation.
  await git(
    input.projectPath,
    ['worktree', 'move', '--', paths.from, paths.to],
    signal,
  );
}

async function placeWorktree(
  input: WorktreeInput,
  setup: { plan: WorktreePlan; taken: TakenBranch | undefined },
  signal?: AbortSignal,
): Promise<void> {
  const { plan, taken } = setup;

  await mkdir(dirname(plan.checkout.path), { recursive: true });
  await (taken
    ? moveTakenWorktree(
        input,
        { from: taken.path, to: plan.checkout.path },
        signal,
      )
    : addWorktree(input, plan, signal));
}

async function materializeWorktree(
  input: WorktreeInput,
  plan: WorktreePlan,
  signal?: AbortSignal,
): Promise<Checkout> {
  const { checkout } = plan;
  const taken = await resolveTakenBranch(input, checkout.branch, signal);

  if (taken?.action === 'reuse') return { ...checkout, path: taken.path };

  await placeWorktree(input, { plan, taken }, signal);

  return checkout;
}

export async function createWorktree(
  input: WorktreeInput,
  signal?: AbortSignal,
): Promise<Checkout> {
  const plan = await planWorktree(input, signal);

  await validateRequestedBranch(input, signal);

  return materializeWorktree(input, plan, signal);
}

async function canCleanAborted(
  input: WorktreeInput,
  checkout: WorktreeCheckout,
  signal?: AbortSignal,
): Promise<boolean> {
  if (existsSync(checkout.path)) return false;

  const { branches } = await listBranches(input.projectPath, signal);

  return !branches.includes(checkout.branch);
}

function addArguments({ checkout, base }: WorktreePlan): string[] {
  return ['worktree', 'add', '-b', checkout.branch, '--', checkout.path, base];
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

function abortedAfterAdd(canClean: boolean, signal?: AbortSignal): boolean {
  return canClean && Boolean(signal?.aborted);
}

async function addWorktree(
  input: WorktreeInput,
  plan: WorktreePlan,
  signal?: AbortSignal,
): Promise<void> {
  const canClean = await canCleanAborted(input, plan.checkout, signal);

  try {
    await git(input.projectPath, addArguments(plan), signal);
  } catch (error) {
    if (abortedAfterAdd(canClean, signal))
      await cleanupAborted(input, plan.checkout);

    throw error;
  }
}
