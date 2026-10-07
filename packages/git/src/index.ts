import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

const execute = promisify(execFile);
const run = (arguments_: string[], signal?: AbortSignal) =>
  execute('git', arguments_, { signal });
let rejectedResponses = 0;
const branchRefPrefix = 'refs/heads/';
const sessionBranchPrefix = 'argo/';
// A local branch ref, read as the branch name.
const branchName = z
  .string()
  .startsWith(branchRefPrefix)
  .min(branchRefPrefix.length + 1)
  .transform((ref) => ref.slice(branchRefPrefix.length));

// Reports and counts a git answer this module does not recognise, then throws.
const rejectResponse = (what: string, detail?: string): never => {
  rejectedResponses += 1;
  console.error(
    `git: rejected ${what} response (${rejectedResponses} rejected)${detail ? `: ${detail}` : ''}`,
  );
  throw new Error(`Unrecognised git ${what} response`);
};
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
    (record) => (record.branch !== undefined) !== (record.detached === true),
  );

// NUL-delimited porcelain keeps paths containing line breaks intact.
const readMainCheckout = (output: string): Checkout => {
  const fields = (output.split('\0\0')[0] ?? '').split('\0').filter(Boolean);
  const record = Object.fromEntries(
    fields.map((field) => {
      const separator = field.indexOf(' ');
      return separator === -1
        ? [field, true]
        : [field.slice(0, separator), field.slice(separator + 1)];
    }),
  );
  const result = checkoutRecord.safeParse(record);
  if (!result.success)
    return rejectResponse('worktree list', result.error.message);
  return {
    path: result.data.worktree,
    branch: result.data.branch ?? null,
  };
};
export interface Checkout {
  path: string;
  branch: string | null;
}

// Where a Session runs: a new worktree from a local branch, or the main checkout (ADR-0008).
export type CheckoutChoice =
  | { type: 'worktree'; baseBranch: string }
  | { type: 'main' };

// Resolves a repository through any working tree or nested directory (ADR-0008).
export async function readRepository(
  path: string,
): Promise<{ root: string; commonDirectory: string }> {
  const directory = await realpath(path);
  const responses = await Promise.all([
    run(['-C', directory, 'rev-parse', '--show-toplevel']),
    run(['-C', directory, 'rev-parse', '--git-common-dir']),
  ]);
  const paths = z
    .tuple([
      z.string().trim().min(1).refine(isAbsolute),
      z.string().trim().min(1),
    ])
    .safeParse(responses.map(({ stdout }) => stdout));
  if (!paths.success)
    return rejectResponse('repository paths', paths.error.message);
  return {
    root: paths.data[0],
    commonDirectory: await realpath(resolve(directory, paths.data[1])),
  };
}

// The Project's local branches, and the branch HEAD is on, or null when detached.
export async function listBranches(
  projectPath: string,
  signal?: AbortSignal,
): Promise<{ branches: string[]; currentBranch: string | null }> {
  const git = (...arguments_: string[]) =>
    run(['-C', projectPath, ...arguments_], signal);
  const [{ stdout }, head] = await Promise.all([
    git('for-each-ref', '--format=%(refname)', 'refs/heads/'),
    git('symbolic-ref', '--quiet', 'HEAD').then(
      ({ stdout }) => stdout.trim(),
      () => null,
    ),
  ]);
  signal?.throwIfAborted();
  const listed = z
    .array(branchName)
    .safeParse(stdout.split('\n').filter(Boolean));
  const current = branchName.nullable().safeParse(head);
  if (!listed.success || !current.success) return rejectResponse('branch list');
  return { branches: listed.data, currentBranch: current.data };
}

// The prefix is stored data and must survive a product rename.
export const sessionBranch = (id: string) => `${sessionBranchPrefix}${id}`;
export const isSessionBranch = (branch: string | null, id: string) =>
  branch === sessionBranch(id);

// The Project may have been registered through any of its working trees.
export async function createCheckout(
  input: {
    projectPath: string;
    projectId: string;
    sessionId: string;
    choice: CheckoutChoice;
    runtimeDirectory: string;
  },
  signal?: AbortSignal,
): Promise<Checkout> {
  const git = async (...arguments_: string[]) =>
    (await run(['-C', input.projectPath, ...arguments_], signal)).stdout.trim();
  const main = readMainCheckout(
    await git('worktree', 'list', '--porcelain', '-z'),
  );
  if (input.choice.type === 'main') return main;
  for (const segment of [input.projectId, input.sessionId])
    if (!/^[a-zA-Z0-9_-]+$/.test(segment))
      throw new Error('Invalid Checkout path segment');
  const checkoutPath = join(
    input.runtimeDirectory,
    'worktrees',
    input.projectId,
    input.sessionId,
  );
  const branch = sessionBranch(input.sessionId);
  await mkdir(dirname(checkoutPath), { recursive: true });
  const checkoutExists = existsSync(checkoutPath);
  const branchExists = (
    await listBranches(input.projectPath, signal)
  ).branches.includes(branch);
  signal?.throwIfAborted();
  try {
    // A full ref keeps the base a local branch, and never an option.
    await git(
      'worktree',
      'add',
      '-b',
      branch,
      checkoutPath,
      `refs/heads/${input.choice.baseBranch}`,
    );
  } catch (error) {
    if (signal?.aborted && !checkoutExists && !branchExists) {
      // Teardown has aborted the creation signal; cleanup owns a fresh one.
      await discardCheckout(
        input.projectPath,
        { path: checkoutPath, branch },
        new AbortController().signal,
        true,
      );
    }
    throw error;
  }
  return { path: checkoutPath, branch };
}

// Removes a worktree that no Turn ran in, with its new branch.
export async function discardCheckout(
  projectPath: string,
  checkout: Checkout,
  signal?: AbortSignal,
  force = false,
): Promise<void> {
  if (existsSync(checkout.path))
    await run(
      [
        '-C',
        projectPath,
        'worktree',
        'remove',
        ...(force ? ['--force', '--force'] : []),
        checkout.path,
      ],
      signal,
    );
  if (
    checkout.branch &&
    (await listBranches(projectPath, signal)).branches.includes(checkout.branch)
  )
    await run(['-C', projectPath, 'branch', '-D', checkout.branch], signal);
}
