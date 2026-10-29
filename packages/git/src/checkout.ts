import { type CheckoutInput, createWorktree } from './checkout-worktree';
import { git } from './git';
import { readMainCheckout, type Checkout } from './repository';

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
