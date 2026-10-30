import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';

const runtimeCases = ['sentinel', 'command', 'delay', 'cancel'] as const;

export type RuntimeCase = (typeof runtimeCases)[number];

const positive = z.coerce.number().int().positive();

const optionsSchema = z.object({
  home: z.string().min(1),
  sessionId: z.string().min(1),
  output: z.string(),
  runs: positive,
  warmups: z.coerce.number().int().nonnegative(),
  cases: z.array(z.enum(runtimeCases)).nonempty(),
  timeoutMs: positive,
  reopen: z.boolean(),
  condition: z.string(),
  cache: z.enum(['warm', 'cold', 'unknown']),
  cachePath: z.string().optional(),
  serverCommit: z.string().optional(),
});

export type RuntimeOptions = z.infer<typeof optionsSchema>;

const help = `Opt-in Server-wire Agent timings; requires an idle disposable Session with a completed Turn when reopening.
  pnpm --filter @repo/tools perf:runtime --real-agent --home PATH --session ID
  --runs 10 --warmups 0 --cases sentinel,command,delay,cancel --timeout-ms 120000
  --condition warm --cache unknown [--cache-path PATH] [--server-commit SHA] [--reopen]
  --output /tmp/argo-runtime-timing.json
No App presentation or operating-system process-start/exit timing is inferred.
Only --real-agent authorizes prompts; --help reads no Server or auth files.`;

const stringOption = { type: 'string' } as const;

const booleanOption = { type: 'boolean' } as const;

const argumentOptions = {
  home: stringOption,
  session: stringOption,
  output: {
    ...stringOption,
    default: path.join(os.tmpdir(), 'argo-runtime-timing.json'),
  },
  runs: { ...stringOption, default: '10' },
  warmups: { ...stringOption, default: '0' },
  cases: { ...stringOption, default: runtimeCases.join(',') },
  'timeout-ms': { ...stringOption, default: '120000' },
  reopen: { ...booleanOption, default: false },
  condition: { ...stringOption, default: 'unspecified' },
  cache: { ...stringOption, default: 'unknown' },
  'cache-path': stringOption,
  'server-commit': stringOption,
  'real-agent': booleanOption,
  help: booleanOption,
};

function readOptions(args: string[]): RuntimeOptions {
  const { values } = parseArgs({ args, options: argumentOptions });

  if (!values['real-agent'])
    throw new Error(
      'Runtime timing is opt-in: pass --real-agent for an isolated disposable Session',
    );

  return optionsSchema.parse({
    ...values,
    sessionId: values.session,
    timeoutMs: values['timeout-ms'],
    cases: values.cases.split(','),
    cachePath: values['cache-path'],
    serverCommit: values['server-commit'],
  });
}

export function runtimeOptions(args: string[]): RuntimeOptions | undefined {
  if (args.includes('--help')) {
    console.log(help);

    return undefined;
  }

  return readOptions(args);
}
