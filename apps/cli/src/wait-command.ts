import { parseArgs } from 'node:util';
import {
  OperationExecution,
  OperationWaitId,
} from '@repo/contracts/operations';
import { z } from 'zod';
import { parseUsage } from './command-error';
import { connectControl } from './control-client';
import { readControlResponse } from './control-response';
import { completeExecutionResult, executionExitCode } from './execution-result';

// Leave transport overhead beyond the Engine's ninety-second observation cap.
export const waitRequestTimeoutMs = 100_000;

function waitArguments(args: string[]): string {
  const { positionals } = parseArgs({ args, allowPositionals: true });

  return z.tuple([OperationWaitId]).parse(positionals)[0];
}

export async function waitOperation(
  args: string[],
  write: (line: string) => void,
): Promise<number> {
  const id = parseUsage(() => waitArguments(args));
  const deadline = performance.now() + waitRequestTimeoutMs;
  const client = await connectControl(waitRequestTimeoutMs);

  const parsed = readControlResponse(
    OperationExecution,
    await client.operations.wait.mutate({ id }),
  );

  const result = await completeExecutionResult(parsed, deadline);
  write(JSON.stringify(result, null, 2));

  return executionExitCode(result);
}
