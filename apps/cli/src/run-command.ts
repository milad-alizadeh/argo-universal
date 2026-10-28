import { parseArgs } from 'node:util';
import {
  OperationId,
  operations,
  OperationExecution,
} from '@repo/contracts/operations';
import { z } from 'zod';
import { parseUsage } from './command-error';
import { connectControl } from './control-client';
import { readControlResponse } from './control-response';
import { executionExitCode, waitRequestTimeoutMs } from './wait-command';

const RunInput = z.strictObject({
  id: OperationId,
  params: z.json(),
  wait: z.boolean(),
});

type RunArguments = z.infer<typeof RunInput>;

function runArguments(args: string[]): RunArguments {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      params: { type: 'string', default: '{}' },
      wait: { type: 'boolean', default: false },
    },
  });

  const [id] = z.tuple([z.string()]).parse(positionals);

  return RunInput.parse({
    id,
    params: JSON.parse(values.params),
    wait: values.wait,
  });
}

export async function runOperation(
  args: string[],
  write: (line: string) => void,
): Promise<number> {
  const { id, params, wait } = parseUsage(() => runArguments(args));
  const client = await connectControl(waitRequestTimeoutMs);

  const result = readControlResponse(
    z.union([operations[id].result, OperationExecution]),
    await client.operations.run.mutate({ id, params, wait }),
  );

  write(JSON.stringify(result, null, 2));

  const execution = OperationExecution.safeParse(result);
  return execution.success ? executionExitCode(execution.data) : 0;
}
