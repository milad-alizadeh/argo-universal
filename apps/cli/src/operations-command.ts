import { parseArgs } from 'node:util';
import type { OperationRow } from '@repo/contracts/operations/control';
import { z } from 'zod';
import { parseUsage } from './command-error';
import type { CommandIo } from './control-client';

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
  { write, client }: CommandIo,
): Promise<number> {
  const { filter, json } = parseUsage(() => discoveryArguments(args));
  const rows = await client.list(filter);

  write(json ? JSON.stringify(rows, null, 2) : rows.map(describe).join('\n'));

  return 0;
}

function describe(row: OperationRow): string {
  const availability = row.enabled
    ? ''
    : ` (unavailable: ${row.disabledReason})`;

  return `${row.id} [${row.tier}] — ${row.description}${availability}`;
}
