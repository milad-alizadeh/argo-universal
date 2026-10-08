import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWaivers } from './not-yet-cleared/document.mts';
import {
  evaluateWaivers,
  type Evaluation,
} from './not-yet-cleared/evaluate.mts';
import { measureFindings } from './not-yet-cleared/measure.mts';
import { growthProblems } from './not-yet-cleared/policy.mts';

const root = fileURLToPath(new URL('..', import.meta.url));
const waiverPath = 'tooling/oxlint/not-yet-cleared.json';

function baselineWaivers(): string {
  const base = execFileSync(
    '/usr/bin/git',
    ['merge-base', 'HEAD', 'origin/main'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  ).trim();
  return execFileSync('/usr/bin/git', ['show', `${base}:${waiverPath}`], {
    cwd: root,
    encoding: 'utf8',
  });
}

function printEntries(result: Evaluation): void {
  for (const entry of result.entries)
    console.log(
      `${entry.glob}: ${entry.findings} findings, ${entry.rules} waived rules`,
    );
}

function printSummary(result: Evaluation): void {
  printEntries(result);
  const findings = result.entries.reduce(
    (total, entry): number => total + entry.findings,
    0,
  );
  const rules = result.entries.reduce(
    (total, entry): number => total + entry.rules,
    0,
  );
  console.log(
    `not-yet-cleared: ${result.entries.length} entries, ${findings} findings, ${rules} waived rules`,
  );
}

function check(result: Evaluation): number {
  for (const problem of result.problems) console.error(problem);
  return result.problems.length > 0 ? 1 : 0;
}

function evaluateTree(): { current: string; result: Evaluation } {
  const current = readFileSync(join(root, waiverPath), 'utf8');
  const baseline = baselineWaivers();
  const growth = growthProblems(readWaivers(current), readWaivers(baseline));
  if (growth.length > 0) throw new Error(growth.join('\n'));
  const result = evaluateWaivers({
    current,
    baseline,
    report: measureFindings(root),
  });
  return { current, result };
}

function prune(current: string, result: Evaluation): number {
  if (current !== result.pruned)
    writeFileSync(join(root, waiverPath), result.pruned);
  console.log(
    current === result.pruned
      ? 'Nothing to prune.'
      : `Pruned ${result.problems.length} stale rules.`,
  );
  return 0;
}

function assertMode(
  mode: string | undefined,
): asserts mode is 'check' | 'prune' {
  if (mode !== 'check' && mode !== 'prune')
    throw new Error('Usage: node tools/not-yet-cleared.mts <check|prune>');
}

function run(mode: string | undefined): number {
  assertMode(mode);
  const { current, result } = evaluateTree();
  printSummary(result);
  return mode === 'check' ? check(result) : prune(current, result);
}

try {
  process.exitCode = run(process.argv[2]);
} catch (error) {
  console.error(
    `not-yet-cleared: rejected input (1): ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
