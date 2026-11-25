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
import { admitVerify } from './verify-admission.mts';
import { chooseBase } from './verify-base.mts';
import {
  chooseTests,
  nothingChecked,
  type TestScope,
} from './verify-scope.mts';
import { recordPassed } from './verify-stamp.mts';

const vitest = path.join(root, 'node_modules/.bin/vitest');

const listedTests = z.array(z.looseObject({ file: z.string() }));

// The local cap Storybook uses, for the plain Vitest projects too; VITEST_MAX_WORKERS still overrides it.
const LOCAL_WORKERS = '2';

const say = (text: string): boolean =>
  process.stdout.write(`verify: ${text}\n`);

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

// Lint and the type checks run side by side; the others are quick.
async function staticChecks(changed: string[]): Promise<Result[]> {
  const changedChecks = checkChanged(changed);

  return [checkFormat(changed), ...generatedChecks(), ...(await changedChecks)];
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
      ? `${dependents} test files depend on the change; running ${files.length} locally. CI covers the remaining ${dependents - files.length}.`
      : `running the ${files.length} test files that depend on the change.`,
  );
}

function runScope(scope: TestScope): number {
  announce(scope);

  const plain = scope.files.filter((file) => !file.endsWith('.stories.tsx'));
  const stories = scope.files.filter((file) => file.endsWith('.stories.tsx'));

  return runFiles(plain) || runFiles(stories);
}

function runFiles(files: string[]): number {
  if (!files.length) return 0;

  const tests = spawnSync(vitest, ['run', ...files], {
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

const { ref, reason, commit: baseCommit } = chooseBase();

say(`checking the change since ${ref} (${reason}).`);

// Turbo's --affected compares with local main; this keeps the type checks on the same base as the tests.
process.env.TURBO_SCM_BASE = baseCommit;

const paths = changedPaths(baseCommit);

const changed = readableFiles(paths);

if (changed.length === 0) {
  say(nothingChecked(paths, ref));
  process.exit(0);
}

await admitVerify();

// A static failure stops verify before its tests, which would only fail on the same cause.
const failed = failedChecks(await staticChecks(changed));

if (failed.length > 0) {
  process.stderr.write(`${joinOutput(failed)}\n`);
  process.exit(failed[0]?.status ?? 1);
}

recordPassed();

say('format, lint and types pass.');

process.exit(runTests(baseCommit, changed));
