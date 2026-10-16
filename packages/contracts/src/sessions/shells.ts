import { z } from 'zod';
import { shellColumns } from '../columns';

export const ShellRecord = shellColumns;

export type ShellRecord = z.infer<typeof ShellRecord>;

export const Shell = shellColumns.omit({ outputBlobId: true }).extend({
  durationMs: z.int(),
  // True only while the Server owns a running ACP terminal it can kill.
  canStop: z.boolean(),
});

export type Shell = z.infer<typeof Shell>;

export const SessionShellsInput = shellColumns.pick({ sessionId: true });

export type SessionShellsInput = z.infer<typeof SessionShellsInput>;

export const SessionShellsOutput = z.array(Shell);

export type SessionShellsOutput = z.infer<typeof SessionShellsOutput>;

export const SessionStopShellInput = z.strictObject({
  sessionId: shellColumns.shape.sessionId,
  shellId: shellColumns.shape.id,
});

export type SessionStopShellInput = z.infer<typeof SessionStopShellInput>;

export const SessionStopShellOutput = z.strictObject({});

export type SessionStopShellOutput = z.infer<typeof SessionStopShellOutput>;

// A byte offset into the Shell's UTF-8 output, exclusive of bytes already read.
export const ShellOutputInput = SessionStopShellInput.extend({
  after: z.int().optional(),
});

export type ShellOutputInput = z.infer<typeof ShellOutputInput>;

// `after` resumes after this chunk; an empty final chunk can report completion.
export const ShellOutput = z.strictObject({
  text: z.string(),
  after: z.int(),
  status: shellColumns.shape.status,
});

export type ShellOutput = z.infer<typeof ShellOutput>;
