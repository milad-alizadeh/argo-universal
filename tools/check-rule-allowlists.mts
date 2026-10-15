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

// The list at the merge base with main, or undefined before it lands there.
function baseline({ path, rule }: Allowlist): string[] | undefined {
  const base = git(['merge-base', 'HEAD', 'origin/main']).trim();

  // ls-tree prints nothing for a path the commit lacks; any other git failure throws.
  const onBase = git(['ls-tree', '--name-only', base, '--', path]);

  return onBase.trim() === ''
    ? undefined
    : readAllowlist(git(['show', `${base}:${path}`]), rule);
}

// oxlint prints `argo(kit-styling)` for the rule `argo/kit-styling`.
const findingCode = (rule: string): string => {
  const [plugin, name] = rule.split('/');

  return `${plugin}(${name})`;
};

function flaggedFiles({ path, rule }: Allowlist): Set<string> {
  const report = reportSchema.parse(JSON.parse(measureFindings(root, path)));

  return new Set(
    report.diagnostics
      .filter((finding): boolean => finding.code === findingCode(rule))
      .map((finding): string => relative(root, join(root, finding.filename))),
  );
}

function check(allowlist: Allowlist): number {
  const current = readAllowlist(
    readFileSync(join(root, allowlist.path), 'utf8'),
    allowlist.rule,
  );

  const problems = allowlistProblems({
    rule: allowlist.rule,
    current,
    baseline: baseline(allowlist),
    flagged: flaggedFiles(allowlist),
  });

  for (const problem of problems) console.error(problem);

  console.log(
    `check-rule-allowlists: ${allowlist.path}: ${current.length} files, ${problems.length} problems`,
  );

  return problems.length;
}

const problemCount = allowlists
  .map(check)
  .reduce((sum, count): number => sum + count, 0);

process.exit(problemCount > 0 ? 1 : 0);
