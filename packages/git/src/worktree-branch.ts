import type { WorktreeInput } from './checkout-worktree';
import { git } from './git';

export class CheckoutBaseMissing extends Error {
  constructor(branch: string) {
    super(
      `No branch ${branch}, and the Project has no commit to start a worktree from`,
    );
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

const readOrNull = (
  projectPath: string,
  arguments_: string[],
  signal?: AbortSignal,
): Promise<string | null> =>
  git(projectPath, arguments_, signal).then(
    (stdout): string | null => stdout.trim() || null,
    (): null => null,
  );

// The branch origin names as its default, while Git still tracks it.
async function originDefault(
  projectPath: string,
  refs: string[],
  signal?: AbortSignal,
): Promise<string | null> {
  const target = await readOrNull(
    projectPath,
    ['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD'],
    signal,
  );

  return target !== null && refs.includes(target) ? target : null;
}

// The main checkout's commit, unless the Project has none yet.
async function mainCheckoutHead(
  projectPath: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const head = await readOrNull(
    projectPath,
    ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}'],
    signal,
  );

  return head === null ? null : 'HEAD';
}

// A base deleted or renamed on the server must not block a new Session, so it falls back to origin's default branch, then the main checkout.
async function fallbackBase(
  projectPath: string,
  refs: string[],
  signal?: AbortSignal,
): Promise<string | null> {
  return (
    (await originDefault(projectPath, refs, signal)) ??
    mainCheckoutHead(projectPath, signal)
  );
}

export async function resolveCheckoutBase(
  projectPath: string,
  branch: string,
  signal?: AbortSignal,
): Promise<string> {
  const refs = (await git(projectPath, baseRefs, signal)).split('\n');

  const base =
    candidateBaseRefs(branch).find((ref) => refs.includes(ref)) ??
    (await fallbackBase(projectPath, refs, signal));

  if (!base) throw new CheckoutBaseMissing(branch);

  return base;
}

const branchPrefixes = ['refs/remotes/origin/', 'refs/heads/'];

// The branch a resolved base names: a tracking or local ref's own name, or the main checkout's branch for its HEAD.
async function baseBranchName(
  projectPath: string,
  base: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const ref =
    base === 'HEAD'
      ? await readOrNull(
          projectPath,
          ['symbolic-ref', '--quiet', 'HEAD'],
          signal,
        )
      : base;

  const prefix = branchPrefixes.find((start) => ref?.startsWith(start));

  return prefix && ref ? ref.slice(prefix.length) : null;
}

// The branch a new worktree from this saved base starts on, for the reader; the saved name while Git names none.
export async function resolveWorktreeBaseBranch(
  projectPath: string,
  saved: string,
  signal?: AbortSignal,
): Promise<string> {
  const base = await resolveCheckoutBase(projectPath, saved, signal);

  return (await baseBranchName(projectPath, base, signal)) ?? saved;
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
