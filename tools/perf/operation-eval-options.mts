import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  readControlToken,
  readServerAddress,
} from '@repo/engine/server-runtime';
import { z } from 'zod';
import { evalTasks } from './operation-eval-tasks.mts';
import type { RuntimeTarget } from './runtime-types.mts';

const taskIds = evalTasks.map(({ id }) => id).join(',');

export const evalHelp = `Live eval of how Agents find and run Argo Operations. It starts real Agent Sessions and spends Agent quota.
  pnpm --filter @repo/tools perf:operations --real-agent [--agents claude-acp,codex-acp] [--runs 3]
  [--tasks ${taskIds}]
  [--project ID | --project-name argo-eval] [--home ~/.argo] [--timeout-ms 240000] [--output DIR] [--keep]
Agents run in parallel; one Agent's runs go one after another. Every Session in the Project is archived at the end unless --keep.`;

const list = z.string().transform((value) => value.split(',').filter(Boolean));

const evalOptions = z.object({
  home: z.string(),
  agents: list,
  runs: z.coerce.number().int().positive(),
  tasks: list,
  project: z.string().optional(),
  projectName: z.string(),
  timeoutMs: z.coerce.number().int().positive(),
  output: z.string(),
  keep: z.boolean(),
});

export type EvalOptions = z.infer<typeof evalOptions>;

const stringOption = { type: 'string' } as const;

const booleanOption = { type: 'boolean', default: false } as const;

const argumentOptions = {
  home: { ...stringOption, default: path.join(os.homedir(), '.argo') },
  agents: { ...stringOption, default: 'claude-acp,codex-acp' },
  runs: { ...stringOption, default: '3' },
  tasks: { ...stringOption, default: taskIds },
  project: stringOption,
  'project-name': { ...stringOption, default: 'argo-eval' },
  'timeout-ms': { ...stringOption, default: '240000' },
  output: {
    ...stringOption,
    default: path.join(os.tmpdir(), `argo-operation-eval-${Date.now()}`),
  },
  keep: booleanOption,
  'real-agent': booleanOption,
  help: booleanOption,
};

// The options, or null to print help: only --real-agent authorizes Sessions that spend Agent quota.
export function readEvalOptions(): EvalOptions | null {
  const { values } = parseArgs({ options: argumentOptions });

  if (values.help || !values['real-agent']) return null;

  return evalOptions.parse({
    ...values,
    projectName: values['project-name'],
    timeoutMs: values['timeout-ms'],
  });
}

// The running Server in the home, reached with the person's control token.
export async function evalTarget(home: string): Promise<RuntimeTarget> {
  const address = readServerAddress(home);

  if (!address) throw new Error(`No Server address in ${home}`);

  return {
    httpUrl: `http://127.0.0.1:${address.port}`,
    token: await readControlToken(home),
    sessionId: '',
  };
}
