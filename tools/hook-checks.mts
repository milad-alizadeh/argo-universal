// The checks tools/agent-hooks.mts runs; read docs/agents/hooks.md before changing them.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const root = fileURLToPath(new URL('..', import.meta.url)).replace(
  /[\\/]$/,
  '',
);
const BLOCK_EXIT_CODE = 2;
const OUTPUT_LINE_LIMIT = 60;
const BLOCKED_HINT = 'docs/agents/hooks.md says what the hooks run.\n';
const UNMATCHED = '--no-error-on-unmatched-pattern';

const lintReport = z.object({
  diagnostics: z.array(
    z.looseObject({
      // An unused disable directive has no rule code.
      code: z.string().default('unused-disable-directive'),
      message: z.string(),
      filename: z.string(),
      labels: z
        .array(z.object({ span: z.looseObject({ line: z.number() }) }))
        .default([]),
    }),
  ),
});
type LintReport = z.infer<typeof lintReport>;
type Diagnostic = LintReport['diagnostics'][number];

export interface Result {
  status: number;
  output: string;
}

export interface LintRun {
  files: string[];
  typeAware: boolean;
  skipped: ReadonlySet<string>;
}

const binary = (name: string): string =>
  path.join(root, 'node_modules/.bin', name);

export function run(command: string, args: string[]): Result {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  return {
    status: result.status ?? 1,
    output: `${result.stdout}${result.stderr}`,
  };
}

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function describe(diagnostic: Diagnostic): string {
  const line = diagnostic.labels[0]?.span.line ?? 0;
  return `${diagnostic.filename}:${line}: ${diagnostic.message} [${diagnostic.code}]`;
}

function findings(report: LintReport, skipped: ReadonlySet<string>): Result {
  const kept = report.diagnostics
    .filter((diagnostic): boolean => !skipped.has(diagnostic.code))
    .map(describe);
  return { status: kept.length > 0 ? 1 : 0, output: kept.join('\n') };
}

// Runs oxlint with the repository config and keeps the findings whose rule is not skipped.
export function lint({ files, typeAware, skipped }: LintRun): Result {
  const flags = typeAware ? ['--type-aware'] : [];
  const args = [...flags, '--format=json', UNMATCHED, ...files];
  const result = run(binary('oxlint'), args);
  const parsed = lintReport.safeParse(parseJson(result.output));
  return parsed.success ? findings(parsed.data, skipped) : result;
}

export function format(files: string[]): Result {
  return run(binary('oxfmt'), ['--write', UNMATCHED, ...files]);
}

export function checkTypes(): Result {
  const args = [
    'run',
    'check-types',
    '--affected',
    '--output-logs=errors-only',
  ];
  return run(binary('turbo'), args);
}

// Prints the first lines of every failed check and returns the exit code that blocks the agent.
export function block(results: Result[]): number {
  const failed = results.filter((result): boolean => result.status !== 0);
  if (failed.length === 0) return 0;
  const output = failed.map((result): string => result.output).join('\n');
  const head = output.split('\n').slice(0, OUTPUT_LINE_LIMIT).join('\n');
  process.stderr.write(`${head}\n${BLOCKED_HINT}`);
  return BLOCK_EXIT_CODE;
}
