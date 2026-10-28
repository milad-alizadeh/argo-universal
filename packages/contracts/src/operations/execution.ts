import { z } from 'zod';
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
  turn: Turn.optional(),
  cancelled: z.literal(true).optional(),
});

export type OperationExecution = z.infer<typeof OperationExecution>;
