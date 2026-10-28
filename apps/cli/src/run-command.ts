import { parseArgs } from 'node:util';
import { OperationId, operations } from '@repo/contracts/operations';
import { z } from 'zod';
import { parseUsage } from './command-error';
import { connectControl } from './control-client';
import { readControlResponse } from './control-response';

const RunInput = z.strictObject({ id: OperationId, params: z.json() });

type RunArguments = z.infer<typeof RunInput>;

function runArguments(args: string[]): RunArguments {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: { params: { type: 'string', default: '{}' } },
  });

  const [id] = z.tuple([z.string()]).parse(positionals);

  return RunInput.parse({ id, params: JSON.parse(values.params) });
}

export async function runOperation(
  args: string[],
  write: (line: string) => void,
): Promise<number> {
  const { id, params } = parseUsage(() => runArguments(args));
  const client = await connectControl();

  const result = readControlResponse(
    operations[id].result,
    await client.operations.run.mutate({ id, params }),
  );

  write(JSON.stringify(result, null, 2));

  return 0;
}
