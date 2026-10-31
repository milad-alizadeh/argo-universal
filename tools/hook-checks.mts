// The checks tools/agent-hook-run.mts and tools/verify.mts run; read docs/agents/hooks.md before changing them.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const root = fileURLToPath(new URL('..', import.meta.url)).replace(
  /[\\/]$/,
  '',
);

export const FORMATTED_FILE = /\.(?:[cm]?[jt]sx?|jsonc?|css|ya?ml)$/;

export const LINTED_FILE = /\.[cm]?[jt]sx?$/;

export const TYPESCRIPT_FILE = /\.[cm]?tsx?$/;

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

const jsonText = z.string().transform((text, context) => {
  try {
    return JSON.parse(text);
  } catch {
    context.addIssue({ code: 'custom', message: 'Not JSON' });

    return z.NEVER;
  }
});

// Text that is not JSON fails like a value that does not match `schema`.
export function parseJson<Schema extends z.ZodType>(
  schema: Schema,
  text: string,
): z.ZodSafeParseResult<z.output<Schema>> {
  return jsonText.pipe(schema).safeParse(text);
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
  const parsed = parseJson(lintReport, result.output);

  return parsed.success ? findings(parsed.data, skipped) : result;
}

export function format(files: string[]): Result {
  return run(binary('oxfmt'), ['--write', UNMATCHED, ...files]);
}

export function checkFormat(files: string[]): Result {
  return run(binary('oxfmt'), ['--check', UNMATCHED, ...files]);
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

// Every path changed or untracked since `base`, whether or not the checks read it.
export function changedPaths(base: string): string[] {
  const tracked = run('git', ['diff', '--name-only', base]).output;
  const untracked = run('git', ['ls-files', '--others', '--exclude-standard']);
  const names = `${tracked}\n${untracked.output}`.split('\n');

  return [...new Set(names)].filter(Boolean);
}

// The changed paths that the checks read and that still exist.
export const readableFiles = (paths: string[]): string[] =>
  paths.filter(
    (name): boolean =>
      FORMATTED_FILE.test(name) && existsSync(path.join(root, name)),
  );

export const changedFiles = (base: string): string[] =>
  readableFiles(changedPaths(base));

// Type-aware lint on the changed files, and the affected type checks when TypeScript changed.
export function checkChanged(files: string[]): Result[] {
  const linted = files.filter((name): boolean => LINTED_FILE.test(name));

  const lintRun = {
    files: linted,
    typeAware: true,
    skipped: new Set<string>(),
  };

  const lints = linted.length > 0 ? [lint(lintRun)] : [];
  const typed = files.some((name): boolean => TYPESCRIPT_FILE.test(name));

  return typed ? [...lints, checkTypes()] : lints;
}

export const failedChecks = (results: Result[]): Result[] =>
  results.filter((result): boolean => result.status !== 0);

export const joinOutput = (results: Result[]): string =>
  results.map((result): string => result.output).join('\n');

// Prints the first lines of every failed check and returns the exit code that blocks the agent.
export function block(results: Result[]): number {
  const failed = failedChecks(results);

  if (failed.length === 0) return 0;
  const output = joinOutput(failed);
  const head = output.split('\n').slice(0, OUTPUT_LINE_LIMIT).join('\n');
  process.stderr.write(`${head}\n${BLOCKED_HINT}`);

  return BLOCK_EXIT_CODE;
}
