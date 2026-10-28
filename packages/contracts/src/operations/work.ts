import { z } from 'zod';
import { sessionColumns, turnColumns } from '../columns';

// The native work started by a Server-owned Operation Tool call.
export const OperationWorkTarget = z.strictObject({
  kind: z.enum(['creation', 'turn']),
  sessionId: sessionColumns.shape.id,
  turnId: turnColumns.shape.id,
});

export type OperationWorkTarget = z.infer<typeof OperationWorkTarget>;
