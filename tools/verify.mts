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
  parseJson,
  readableFiles,
  type Result,
  root,
  run,
} from './hook-checks.mts';
import { chooseBase } from './verify-base.mts';
import {
  chooseTests,
  nothingChecked,
  type TestScope,
} from './verify-scope.mts';

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

function* staticChecks(changed: string[]): Generator<Result> {
  yield checkFormat(changed);
  yield* checkChanged(changed);
  yield run(process.execPath, ['tools/check-operation-mutations.mts']);
  yield run(process.execPath, operationGeneration);
  yield run(process.execPath, registryGeneration);
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

for (const result of staticChecks(changed)) {
  if (result.status !== 0) process.exit(reportFailure(result));
}

say('format, lint and types pass.');

process.exit(runTests(baseCommit, changed));
