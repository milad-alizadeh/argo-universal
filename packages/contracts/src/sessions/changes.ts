import { z } from 'zod';
import { sessionColumns } from '../columns';
import { DiffChange, DiffPatch } from '../feed/tool-call';

// The default comparison's totals in a Session snapshot.
export const ChangesSummary = z.strictObject({
  files: z.int(),
  additions: z.int(),
  deletions: z.int(),
});

export type ChangesSummary = z.infer<typeof ChangesSummary>;

export const emptyChangesSummary: ChangesSummary = {
  files: 0,
  additions: 0,
  deletions: 0,
};

// One changed file. Binary file counts are null because Git reports `-`.
export const ChangedFile = z.strictObject({
  operation: DiffChange.shape.operation,
  path: z.string(),
  oldPath: z.string().optional(),
  additions: z.int().nullable(),
  deletions: z.int().nullable(),
});

export const SessionComparison = z.union([
  z.literal('main'),
  z.literal('uncommitted'),
  z.strictObject({ branch: z.string().min(1) }),
]);

export type SessionComparison = z.infer<typeof SessionComparison>;

// A page of a list: where it starts and how much it holds. The next page starts at the returned `nextCursor`.
const largestPage = 500;

const pageInput = {
  cursor: z.int().min(0).optional(),
  limit: z.int().min(1).max(largestPage).optional(),
};

export const SessionChangesInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  comparison: SessionComparison.optional(),
  ...pageInput,
});

export type SessionChangesInput = z.infer<typeof SessionChangesInput>;

// One page of the changed files, with the whole comparison's totals.
export const SessionChangesOutput = z.strictObject({
  mainBranch: z.string().nullable(),
  summary: ChangesSummary,
  files: z.array(ChangedFile),
  nextCursor: z.int().nullable(),
});

export type SessionChangesOutput = z.infer<typeof SessionChangesOutput>;

export const SessionDiffInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  path: z.string(),
  comparison: SessionComparison.optional(),
  ...pageInput,
});

export type SessionDiffInput = z.infer<typeof SessionDiffInput>;

/*
 * One page of a file's unified diff, as `git diff` prints it, counted in diff lines; each page repeats the file's
 * header lines. A binary file's patch has no hunks.
 */
export const SessionDiffOutput = z.strictObject({
  file: ChangedFile,
  patch: DiffPatch,
  nextCursor: z.int().nullable(),
});

export type SessionDiffOutput = z.infer<typeof SessionDiffOutput>;

export const SessionBranchesInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
});

export const SessionBranchesOutput = z.strictObject({
  branches: z.array(z.strictObject({ name: z.string(), ref: z.string() })),
});

export type SessionBranchesInput = z.infer<typeof SessionBranchesInput>;

export type SessionBranchesOutput = z.infer<typeof SessionBranchesOutput>;
