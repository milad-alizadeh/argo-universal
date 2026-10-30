import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveExecutable } from '@repo/executables';
import { z } from 'zod';
import { formatFinding, unlistedFindings } from './lint-findings.mts';
import { measureFindings } from './measure-allowlist.mts';
import { allowlistProblems, readAllowlist } from './rule-allowlist.mts';

const root = fileURLToPath(new URL('..', import.meta.url));

// Each shrinking allowlist and the rule it waives (ADR-0016).
const allowlists = [
  {
    path: 'tooling/oxlint/kit-styling-allowlist.json',
    rule: 'argo/kit-styling',
  },
] as const;

type Allowlist = (typeof allowlists)[number];

const reportSchema = z.object({
  diagnostics: z.array(z.object({ filename: z.string(), code: z.string() })),
});

const git = (args: string[]): string =>
  execFileSync(resolveExecutable('git'), args, { cwd: root, encoding: 'utf8' });

const base = git(['merge-base', 'HEAD', 'origin/main']).trim();

// The list at the merge base with main, or undefined before it lands there.
function baseline({ path, rule }: Allowlist): string[] | undefined {
  // ls-tree prints nothing for a path the commit lacks; any other git failure throws.
  const onBase = git(['ls-tree', '--name-only', base, '--', path]);

  return onBase.trim() === ''
    ? undefined
    : readAllowlist(git(['show', `${base}:${path}`]), rule);
}

const movedPair = (line: string): [string, string] => {
  const [, from = '', to = ''] = line.split('\t');

  return [to, from];
};

// Files git sees as moved since the merge base, new path to old: a moved file keeps its waiver.
const movedFiles = (): Map<string, string> =>
  new Map(
    git(['diff', '--find-renames', '--name-status', base])
      .split('\n')
      .filter((line): boolean => line.startsWith('R'))
      .map(movedPair),
  );

const moved = movedFiles();

// oxlint prints `argo(kit-styling)` for the rule `argo/kit-styling`.
const findingCode = (rule: string): string => {
  const [plugin, name] = rule.split('/');

  return `${plugin}(${name})`;
};

function flaggedFiles({ rule }: Allowlist, report: string): Set<string> {
  return new Set(
    reportSchema
      .parse(JSON.parse(report))
      .diagnostics.filter(
        (finding): boolean => finding.code === findingCode(rule),
      )
      .map((finding): string => relative(root, join(root, finding.filename))),
  );
}

function currentAllowlist(allowlist: Allowlist): string[] {
  return readAllowlist(
    readFileSync(join(root, allowlist.path), 'utf8'),
    allowlist.rule,
  );
}

function check(allowlist: Allowlist, report: string): number {
  const current = currentAllowlist(allowlist);

  const problems = allowlistProblems({
    rule: allowlist.rule,
    current,
    baseline: baseline(allowlist),
    flagged: flaggedFiles(allowlist, report),
    moved,
  });

  for (const problem of problems) console.error(problem);

  console.log(
    `check-rule-allowlists: ${allowlist.path}: ${current.length} files, ${problems.length} problems`,
  );

  return problems.length;
}

// Check the findings for each allowlist.
function checkRuleAllowlists(report: string): number {
  const problemCount = allowlists
    .map((allowlist): number => check(allowlist, report))
    .reduce((sum, count): number => sum + count, 0);

  return problemCount > 0 ? 1 : 0;
}

const waivedFiles = (): Map<string, ReadonlySet<string>> =>
  new Map(
    allowlists.map((allowlist): [string, ReadonlySet<string>] => [
      findingCode(allowlist.rule),
      new Set(currentAllowlist(allowlist)),
    ]),
  );

// The lint gate: what the full config reports, warnings included, from the same run.
function checkLint(report: string): number {
  const findings = unlistedFindings(report, waivedFiles());

  for (const finding of findings) console.error(formatFinding(finding));

  console.log(`oxlint: ${findings.length} findings outside the allowlists`);

  return findings.length > 0 ? 1 : 0;
}

// One type-aware oxlint run, with each allowlisted rule on in its files, serves the lint gate and the allowlist checks.
if (import.meta.main) {
  const report = measureFindings(root);

  process.exit(Math.max(checkLint(report), checkRuleAllowlists(report)));
}
