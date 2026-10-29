import { parseArgs } from 'node:util';
import { z } from 'zod';
import { parseUsage } from './command-error';
import type { CommandIo, RunRequest } from './control-client';
import { writeRunResponse } from './execution-result';

// The Server knows which Operations exist, so any id is passed on; an unknown one comes back as usage.
const RunInput = z.strictObject({
  id: z.string().min(1),
  params: z.json(),
  wait: z.boolean(),
});

const runOptions = {
  params: { type: 'string', default: '{}' },
  wait: { type: 'boolean', default: false },
} as const;

function runArguments(args: string[]): RunRequest {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: runOptions,
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
  { write, client }: CommandIo,
): Promise<number> {
  const request = parseUsage(() => runArguments(args));

  return writeRunResponse(write, await client.run(request));
}
