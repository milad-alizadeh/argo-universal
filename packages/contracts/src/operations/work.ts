import { z } from 'zod';

// The native work started by a Server-owned Operation Tool call.
export const OperationWorkTarget = z.strictObject({
  kind: z.enum(['creation', 'turn']),
  sessionId: z.string(),
  turnId: z.string(),
});

export type OperationWorkTarget = z.infer<typeof OperationWorkTarget>;
