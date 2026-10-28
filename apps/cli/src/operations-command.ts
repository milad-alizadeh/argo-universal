import { parseArgs } from 'node:util';
import { OperationRow } from '@repo/contracts/operations';
import { z } from 'zod';
import { parseUsage } from './command-error';
import { connectControl } from './control-client';
import { readControlResponse } from './control-response';

type DiscoveryArguments = { filter: string | undefined; json: boolean };

function discoveryArguments(args: string[]): DiscoveryArguments {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: { json: { type: 'boolean', default: false } },
  });

  const [filter] = z.array(z.string()).max(1).parse(positionals);

  return { filter, json: values.json };
}

export async function runOperations(
  args: string[],
  write: (line: string) => void,
): Promise<number> {
  const { filter, json } = parseUsage(() => discoveryArguments(args));
  const client = await connectControl();

  const rows = readControlResponse(
    z.array(OperationRow),
    await client.operations.list.query({ filter }),
  );

  write(json ? JSON.stringify(rows, null, 2) : rows.map(describe).join('\n'));

  return 0;
}

function describe(row: z.infer<typeof OperationRow>): string {
  const availability = row.enabled
    ? ''
    : ` (unavailable: ${row.disabledReason})`;

  return `${row.id} [${row.tier}] — ${row.description}${availability}`;
}
