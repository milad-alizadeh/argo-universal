import { parseArgs } from 'node:util';
import { OperationWaitId } from '@repo/contracts/operations/control';
import { z } from 'zod';
import { parseUsage } from './command-error';
import type { CommandIo } from './control-client';
import { writeExecution } from './execution-result';

function waitArguments(args: string[]): string {
  const { positionals } = parseArgs({ args, allowPositionals: true });

  return z.tuple([OperationWaitId]).parse(positionals)[0];
}

export async function waitOperation(
  args: string[],
  { write, client }: CommandIo,
): Promise<number> {
  const id = parseUsage(() => waitArguments(args));

  return writeExecution(write, await client.wait(id));
}
