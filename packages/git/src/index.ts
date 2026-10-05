import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

const run = promisify(execFile);
let rejectedResponses = 0;
const checkoutRecord = z
  .strictObject({
    worktree: z.string().refine(isAbsolute),
    HEAD: z.string().regex(/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/),
    branch: z.string().startsWith('refs/heads/').min(12).optional(),
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
  if (!result.success) {
    rejectedResponses += 1;
    console.error(
      `git: rejected worktree list response (${rejectedResponses} rejected): ${result.error.message}`,
    );
    throw new Error('Unrecognised git worktree list response');
  }
  return {
    path: result.data.worktree,
    branch: result.data.branch?.slice('refs/heads/'.length) ?? null,
  };
};
export interface Checkout {
  path: string;
  branch: string | null;
}

// The Project may have been registered through any of its working trees.
export async function createCheckout(input: {
  projectPath: string;
  projectId: string;
  sessionId: string;
  choice: 'main' | 'worktree';
  runtimeDirectory: string;
}): Promise<Checkout> {
  const git = async (...arguments_: string[]) =>
    (await run('git', ['-C', input.projectPath, ...arguments_])).stdout.trim();
  const main = readMainCheckout(
    await git('worktree', 'list', '--porcelain', '-z'),
  );
  if (input.choice === 'main') return main;
  for (const segment of [input.projectId, input.sessionId])
    if (!/^[a-zA-Z0-9_-]+$/.test(segment))
      throw new Error('Invalid Checkout path segment');
  const checkoutPath = join(
    input.runtimeDirectory,
    'worktrees',
    input.projectId,
    input.sessionId,
  );
  const branch = `argo/${input.sessionId}`;
  await mkdir(dirname(checkoutPath), { recursive: true });
  await git('worktree', 'add', '-b', branch, checkoutPath);
  return { path: checkoutPath, branch };
}

export async function removeCheckout(
  projectPath: string,
  checkout: Checkout,
): Promise<void> {
  await run('git', ['-C', projectPath, 'worktree', 'remove', checkout.path]);
  if (checkout.branch)
    await run('git', ['-C', projectPath, 'branch', '-d', checkout.branch]);
}
