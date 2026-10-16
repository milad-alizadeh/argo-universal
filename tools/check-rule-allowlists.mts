import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { measureFindings } from './not-yet-cleared/measure.mts';
import { allowlistProblems, readAllowlist } from './rule-allowlist.mts';

const root = fileURLToPath(new URL('..', import.meta.url));

// Each shrinking allowlist and the rule it waives (ADR-0016).
const allowlists = [
  {
    path: 'tooling/oxlint/kit-styling-allowlist.json',
    rule: 'argo/kit-styling',
  },
  {
    path: 'tooling/oxlint/style-tokens-allowlist.json',
    rule: 'argo/style-tokens',
  },
] as const;

type Allowlist = (typeof allowlists)[number];

const reportSchema = z.object({
  diagnostics: z.array(z.object({ filename: z.string(), code: z.string() })),
});

const git = (args: string[]): string =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' });

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

function check(allowlist: Allowlist, report: string): number {
  const current = readAllowlist(
    readFileSync(join(root, allowlist.path), 'utf8'),
    allowlist.rule,
  );

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

// Checks every allowlist against a report that tools/check-lint-waivers.mts shares with the waiver check.
export function checkRuleAllowlists(report: string): number {
  const problemCount = allowlists
    .map((allowlist): number => check(allowlist, report))
    .reduce((sum, count): number => sum + count, 0);

  return problemCount > 0 ? 1 : 0;
}

if (import.meta.main) process.exit(checkRuleAllowlists(measureFindings(root)));
