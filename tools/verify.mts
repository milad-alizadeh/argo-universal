// `pnpm verify`: an agent's checks before it hands back, sized to its change; CI runs the full suites (docs/agents/hooks.md).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import {
  changedPaths,
  checkChanged,
  checkFormat,
  failedChecks,
  joinOutput,
  parseJson,
  readableFiles,
  type Result,
  root,
  run,
} from './hook-checks.mts';
import { chooseTests, nothingChecked, type TestScope } from './verify-scope.mts';

const vitest = path.join(root, 'node_modules/.bin/vitest');

const listedTests = z.array(z.looseObject({ file: z.string() }));

// The local cap Storybook uses, for the plain Vitest projects too; VITEST_MAX_WORKERS still overrides it.
const LOCAL_WORKERS = '2';

const say = (text: string): boolean =>
  process.stdout.write(`verify: ${text}\n`);

function mergeBase(): string {
  for (const ref of ['origin/main', 'main']) {
    const base = run('git', ['merge-base', 'HEAD', ref]);

    if (base.status === 0) return base.output.trim();
  }

  return 'HEAD';
}

const operationGeneration = [
  '--import',
  'tsx',
  'tools/generate-operations.mts',
  '--check',
];

const registryGeneration = [
  '--import',
  'tsx',
  'packages/contracts/tools/registry/generate-validators.mts',
  '--check',
];

function generatedChecks(): Result[] {
  return [
    run(process.execPath, ['tools/check-operation-mutations.mts']),
    run(process.execPath, operationGeneration),
    run(process.execPath, registryGeneration),
  ];
}

function staticChecks(changed: string[]): Result[] {
  return [checkFormat(changed), ...checkChanged(changed), ...generatedChecks()];
}

type Listing =
  | { listed: true; tests: string[] }
  | { listed: false; failure: Result };

// Vitest's module graph names every test that imports a changed file, without starting a browser.
function dependentTests(base: string): Listing {
  const scratch = mkdtempSync(path.join(tmpdir(), 'verify-'));
  const report = path.join(scratch, 'tests.json');

  try {
    const args = ['list', '--filesOnly', '--changed', base, `--json=${report}`];
    const listing = run(vitest, args);

    if (listing.status !== 0) return { listed: false, failure: listing };

    return readListing(report);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function readListing(report: string): Listing {
  const parsed = parseJson(listedTests, readFileSync(report, 'utf8'));

  if (parsed.success)
    return { listed: true, tests: parsed.data.map(({ file }) => file) };

  return {
    listed: false,
    failure: { status: 1, output: 'vitest list wrote an unreadable report' },
  };
}

function announce({ files, dependents, narrowed }: TestScope): void {
  say(
    narrowed
      ? `${dependents} test files depend on the change; running the ${files.length} in the folders you touched. CI runs the rest.`
      : `running the ${files.length} test files that depend on the change.`,
  );
}

function runScope(scope: TestScope): number {
  announce(scope);

  if (scope.files.length === 0) return 0;

  const tests = spawnSync(vitest, ['run', ...scope.files], {
    cwd: root,
    stdio: 'inherit',
    env: { VITEST_MAX_WORKERS: LOCAL_WORKERS, ...process.env },
  });

  return tests.status ?? 1;
}

function reportFailure({ status, output }: Result): number {
  process.stderr.write(output);

  return status;
}

function runTests(base: string, changed: string[]): number {
  const listing = dependentTests(base);

  return listing.listed
    ? runScope(chooseTests({ tests: listing.tests, changed, root }))
    : reportFailure(listing.failure);
}

const base = mergeBase();

// Turbo's --affected compares with local main; this keeps the type checks on the same base as the tests.
process.env.TURBO_SCM_BASE = base;

const paths = changedPaths(base);

const changed = readableFiles(paths);

if (changed.length === 0) {
  say(nothingChecked(paths));
  process.exit(0);
}

const failed = failedChecks(staticChecks(changed));

if (failed.length > 0) process.stderr.write(`${joinOutput(failed)}\n`);

say(
  failed.length === 0
    ? 'format, lint and types pass.'
    : 'format, lint or types failed.',
);

const testStatus = runTests(base, changed);

process.exit(failed.length > 0 || testStatus !== 0 ? 1 : 0);
