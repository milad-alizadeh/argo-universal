import { z } from 'zod';
import { sessionColumns } from '../columns';
import { DiffChange, DiffPatch } from '../feed/tool-call';

// The uncommitted changes in a Session's Checkout, for the Changed files chip.
export const ChangesSummary = z.strictObject({
  files: z.int().nonnegative(),
  additions: z.int().nonnegative(),
  deletions: z.int().nonnegative(),
});
export type ChangesSummary = z.infer<typeof ChangesSummary>;

// One uncommitted file, from `git status` and `git diff --numstat`; the counts are null for a binary file, as numstat gives `-`.
export const ChangedFile = z.strictObject({
  operation: DiffChange.shape.operation,
  path: z.string(),
  oldPath: z.string().optional(),
  additions: z.int().nonnegative().nullable(),
  deletions: z.int().nonnegative().nullable(),
});
export type ChangedFile = z.infer<typeof ChangedFile>;

export const SessionChangesInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
});
export type SessionChangesInput = z.infer<typeof SessionChangesInput>;

export const SessionChangesOutput = z.array(ChangedFile);
export type SessionChangesOutput = z.infer<typeof SessionChangesOutput>;

export const SessionDiffInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  path: z.string().min(1),
});
export type SessionDiffInput = z.infer<typeof SessionDiffInput>;

// One file's unified diff, as `git diff` prints it; a binary file's patch has no hunks.
export const SessionDiffOutput = z.strictObject({
  file: ChangedFile,
  patch: DiffPatch,
});
export type SessionDiffOutput = z.infer<typeof SessionDiffOutput>;
