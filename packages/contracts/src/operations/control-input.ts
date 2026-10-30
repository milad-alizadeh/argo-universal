import { z } from 'zod';
import { OperationWaitId } from './execution';

export const operationWaitLimitMs = 90_000;

const timeoutMs = z.number().int().min(1).max(operationWaitLimitMs).optional();

export const OperationRunRequest = z.strictObject({
  id: z.string(),
  params: z.json().default({}),
  wait: z.boolean().default(false),
  timeoutMs,
});

export type OperationRunRequest = z.infer<typeof OperationRunRequest>;

export const OperationWaitRequest = z.strictObject({
  id: OperationWaitId,
  timeoutMs,
});

export type OperationWaitRequest = z.infer<typeof OperationWaitRequest>;
