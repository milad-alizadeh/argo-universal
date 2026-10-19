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

export const SessionChangesInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  comparison: SessionComparison.optional(),
});

export type SessionChangesInput = z.infer<typeof SessionChangesInput>;

export const SessionChangesOutput = z.strictObject({
  mainBranch: z.string().nullable(),
  files: z.array(ChangedFile),
});

export type SessionChangesOutput = z.infer<typeof SessionChangesOutput>;

export const SessionDiffInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  path: z.string(),
  comparison: SessionComparison.optional(),
});

export type SessionDiffInput = z.infer<typeof SessionDiffInput>;

// One file's unified diff, as `git diff` prints it; a binary file's patch has no hunks.
export const SessionDiffOutput = z.strictObject({
  file: ChangedFile,
  patch: DiffPatch,
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
