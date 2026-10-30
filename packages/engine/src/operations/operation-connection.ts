import type { OperationRunRequest } from '@repo/contracts/operations/control';

export type OperationConnection = Pick<
  OperationRunRequest,
  'wait' | 'timeoutMs'
> & {
  token?: string;
  signal?: AbortSignal;
};

export function operationConnection(
  token: string | undefined,
  request: OperationRunRequest,
  signal: AbortSignal | undefined,
): OperationConnection {
  return { token, wait: request.wait, timeoutMs: request.timeoutMs, signal };
}
