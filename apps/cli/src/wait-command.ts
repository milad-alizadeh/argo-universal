import { parseArgs } from 'node:util';
import {
  OperationExecution,
  OperationWaitId,
} from '@repo/contracts/operations';
import { z } from 'zod';
import { parseUsage } from './command-error';
import { connectControl } from './control-client';
import { readControlResponse } from './control-response';

// Leave transport overhead beyond the Engine's ninety-second observation cap.
export const waitRequestTimeoutMs = 100_000;

export function executionExitCode(result: OperationExecution): number {
  return result.status === 'settled' ? 0 : 75;
}

export async function waitOperation(
  args: string[],
  write: (line: string) => void,
): Promise<number> {
  const id = parseUsage(() => {
    const { positionals } = parseArgs({ args, allowPositionals: true });
    return z.tuple([OperationWaitId]).parse(positionals)[0];
  });
  const client = await connectControl(waitRequestTimeoutMs);
  const result = readControlResponse(
    OperationExecution,
    await client.operations.wait.mutate({ id }),
  );
  write(JSON.stringify(result, null, 2));
  return executionExitCode(result);
}
