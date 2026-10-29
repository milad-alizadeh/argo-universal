import { z } from 'zod';
import { BlobRef } from '../feed/content-block';
import { Turn } from '../sessions/turn';

// A Server-signed native Session/Turn or Session/Tool call identity.
export const OperationWaitId = z
  .string()
  .regex(
    /^(?:creation|turn|call):[A-Za-z0-9_-]+:[a-f0-9]{64}$/,
    'Expected an Operation wait id returned by argo run',
  );

export const OperationExecution = z.strictObject({
  kind: z.literal('operation_execution'),
  id: OperationWaitId,
  status: z.enum(['settled', 'still_running', 'waiting_for_user']),
  result: z.json().optional(),
  fullResult: BlobRef.optional(),
  turn: Turn.optional(),
  cancelled: z.literal(true).optional(),
});

export type OperationExecution = z.infer<typeof OperationExecution>;

// An Operation's own result, answered at once.
export const OperationAnswer = z.strictObject({
  kind: z.literal('result'),
  result: z.json(),
});

// What `operations.run` answers: the Operation's result, or the native work it is still running.
export const OperationRunResponse = z.discriminatedUnion('kind', [
  OperationAnswer,
  OperationExecution,
]);

export type OperationRunResponse = z.infer<typeof OperationRunResponse>;
