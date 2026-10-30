import { realpath } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { z } from 'zod';
import { git } from './git';
import { rejectResponse } from './reject-response';

const branchRefPrefix = 'refs/heads/';

// A local branch ref, read as the branch name.
const branchName = z
  .string()
  .startsWith(branchRefPrefix)
  .min(branchRefPrefix.length + 1)
  .transform((ref): string => ref.slice(branchRefPrefix.length));

const checkoutRecord = z
  .strictObject({
    worktree: z.string().refine(isAbsolute),
    HEAD: z.string().regex(/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/),
    branch: branchName.optional(),
    detached: z.literal(true).optional(),
    locked: z.union([z.literal(true), z.string()]).optional(),
    prunable: z.union([z.literal(true), z.string()]).optional(),
  })
  .refine(
    (record): boolean =>
      (record.branch !== undefined) !== (record.detached === true),
  );

function recordField(field: string): [string, string] | [string, boolean] {
  const separator = field.indexOf(' ');

  return separator === -1
    ? [field, true]
    : [field.slice(0, separator), field.slice(separator + 1)];
}

const checkoutFields = (output: string): string[] =>
  (output.split('\0\0')[0] ?? '').split('\0').filter(Boolean);

// NUL-delimited porcelain keeps paths containing line breaks intact.
export function readMainCheckout(output: string): Checkout {
  const fields = checkoutFields(output);

  const result = checkoutRecord.safeParse(
    Object.fromEntries(fields.map(recordField)),
  );

  if (!result.success)
    return rejectResponse('worktree list', result.error.message);

  return { path: result.data.worktree, branch: result.data.branch ?? null };
}

export interface Checkout {
  path: string;
  branch: string | null;
}

// Where a Session runs: a new worktree from a local branch, or the main checkout (ADR-0008).
export type CheckoutChoice =
  | { type: 'worktree'; baseBranch: string }
  | { type: 'main' };

// A repository: the common directory that names it, and the main checkout it is registered at.
export interface Repository {
  mainCheckout: string;
  commonDirectory: string;
}

// Resolves a repository through any working tree or nested directory, at its main checkout (ADR-0008).
export async function readRepository(path: string): Promise<Repository> {
  const directory = await realpath(path);

  const [checkouts, commonDirectory] = await Promise.all([
    git(directory, ['worktree', 'list', '--porcelain', '-z']),
    git(directory, ['rev-parse', '--git-common-dir']),
  ]);

  return {
    mainCheckout: readMainCheckout(checkouts).path,
    commonDirectory: await readCommonDirectory(directory, commonDirectory),
  };
}

const commonDirectoryResponse = z.string().trim().min(1);

// `--git-common-dir` answers relative to the directory it was asked in.
async function readCommonDirectory(
  directory: string,
  response: string,
): Promise<string> {
  const parsed = commonDirectoryResponse.safeParse(response);

  if (!parsed.success)
    return rejectResponse('repository paths', parsed.error.message);

  return realpath(resolve(directory, parsed.data));
}

// The Project's local branches, and the branch HEAD is on, or null when detached.
export async function listBranches(
  projectPath: string,
  signal?: AbortSignal,
): Promise<{ branches: string[]; currentBranch: string | null }> {
  const inProject: ProjectGit = (...arguments_) =>
    git(projectPath, arguments_, signal);

  const [stdout, head] = await Promise.all([
    inProject('for-each-ref', '--format=%(refname)', 'refs/heads/'),
    currentHead(inProject),
  ]);

  signal?.throwIfAborted();

  return parseBranches(stdout, head);
}

type ProjectGit = (...args: string[]) => Promise<string>;

function currentHead(inProject: ProjectGit): Promise<string | null> {
  return inProject('symbolic-ref', '--quiet', 'HEAD').then(
    (stdout): string => stdout.trim(),
    (): null => null,
  );
}

type Branches = { branches: string[]; currentBranch: string | null };

function parseBranches(stdout: string, head: string | null): Branches {
  const listed = z
    .array(branchName)
    .safeParse(stdout.split('\n').filter(Boolean));

  const current = branchName.nullable().safeParse(head);

  if (!listed.success || !current.success) return rejectResponse('branch list');

  return { branches: listed.data, currentBranch: current.data };
}
