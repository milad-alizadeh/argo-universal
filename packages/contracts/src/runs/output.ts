import { z } from 'zod';

export const RunOutputCursor = z.strictObject({
  runId: z.string().min(1),
  offset: z.int().nonnegative(),
});

export type RunOutputCursor = z.infer<typeof RunOutputCursor>;

export const RunOutput = z.strictObject({
  cursor: RunOutputCursor,
  // Raw terminal bytes encoded as base64. A frame may split a UTF-8 sequence.
  data: z.string(),
});

export type RunOutput = z.infer<typeof RunOutput>;

// A Run PTY and its terminal viewers share this geometry for live output and replay.
export const terminalColumns = 120;

export const terminalRows = 32;
