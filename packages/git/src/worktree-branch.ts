import type { WorktreeInput } from './checkout-worktree';
import { git } from './git';

export class CheckoutBaseMissing extends Error {
  constructor(branch: string) {
    super(`No local branch or origin tracking branch ${branch}`);
  }
}

const baseRefs = [
  'for-each-ref',
  '--format=%(refname)',
  'refs/heads',
  'refs/remotes/origin',
];

function candidateBaseRefs(branch: string): string[] {
  const local = `refs/heads/${branch}`;

  return branch === 'HEAD' ? [local] : [`refs/remotes/origin/${branch}`, local];
}

export async function resolveCheckoutBase(
  projectPath: string,
  branch: string,
  signal?: AbortSignal,
): Promise<string> {
  const refs = (await git(projectPath, baseRefs, signal)).split('\n');
  const base = candidateBaseRefs(branch).find((ref) => refs.includes(ref));

  if (!base) throw new CheckoutBaseMissing(branch);

  return base;
}

export type TakenBranch = { path: string; action: 'reuse' | 'remove' };

type BranchHolder = {
  branch: string;
  path: string;
  index: number;
  fields: string[];
  shared: boolean;
};

const listArguments = ['worktree', 'list', '--porcelain', '-z'];

type BranchRecords = { records: string[][]; holders: string[][] };

function branchRecords(output: string, branch: string): BranchRecords {
  const records = output.split('\0\0').map((record) => record.split('\0'));
  const refField = `branch refs/heads/${branch}`;

  return {
    records,
    holders: records.filter((fields) => fields.includes(refField)),
  };
}

function findBranchHolder(
  output: string,
  branch: string,
): BranchHolder | undefined {
  const { records, holders } = branchRecords(output, branch);
  const [fields] = holders;

  if (!fields) return undefined;

  return {
    branch,
    path: String(fields[0]).slice('worktree '.length),
    index: records.indexOf(fields),
    fields,
    shared: holders.length > 1,
  };
}

function availableWorktree({ index, fields }: BranchHolder): boolean {
  return (
    index > 0 && !fields.some((field) => /^(locked|prunable)( |$)/.test(field))
  );
}

function canTransfer(input: WorktreeInput, holder: BranchHolder): boolean {
  return availableWorktree(holder) && input.isOwned?.(holder.path) === false;
}

function requireAvailableHolder(
  input: WorktreeInput,
  holder: BranchHolder,
  message: string,
): void {
  if (holder.shared)
    throw new Error(`${message} Git reports more than one holder.`);

  if (!canTransfer(input, holder)) throw new Error(message);
}

const statusArguments = [
  'status',
  '--porcelain',
  '--untracked-files=all',
  '--ignored',
  '--ignore-submodules=none',
];

async function requireCleanHolder(
  path: string,
  message: string,
  signal?: AbortSignal,
): Promise<void> {
  if (await git(path, statusArguments, signal))
    throw new Error(`${message} The worktree has local files or changes.`);
}

function acceptedChoice(
  path: string,
  message: string,
  choice?: TakenBranch,
): TakenBranch {
  if (choice?.path === path) return choice;

  const reuse = JSON.stringify({ action: 'reuse', path });

  throw new Error(
    `${message} Retry with checkout.takenBranch set to ${reuse} to use it, or choose action "remove" to replace it.`,
  );
}

async function offerChoice(
  input: WorktreeInput,
  holder: BranchHolder,
  signal?: AbortSignal,
): Promise<TakenBranch> {
  const message = `Branch ${holder.branch} is checked out at ${holder.path}.`;

  if (!input.choice.branch) throw new Error(message);

  requireAvailableHolder(input, holder, message);
  await requireCleanHolder(holder.path, message, signal);
  signal?.throwIfAborted();

  return acceptedChoice(holder.path, message, input.choice.takenBranch);
}

export async function resolveTakenBranch(
  input: WorktreeInput,
  branch: string,
  signal?: AbortSignal,
): Promise<TakenBranch | undefined> {
  const output = await git(input.projectPath, listArguments, signal);
  const holder = findBranchHolder(output, branch);

  if (holder) return offerChoice(input, holder, signal);

  if (input.choice.takenBranch)
    throw new Error(
      'The worktree holding the requested branch has changed. Start again without a choice.',
    );

  return undefined;
}
