import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { allowlistProblems, readAllowlist } from './kit-styling-allowlist.mts';
import { measureFindings } from './not-yet-cleared/measure.mts';

const root = fileURLToPath(new URL('..', import.meta.url));

const allowlistPath = 'tooling/oxlint/kit-styling-allowlist.json';

const reportSchema = z.object({
  diagnostics: z.array(z.object({ filename: z.string(), code: z.string() })),
});

const git = (args: string[]): string =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' });

// The list at the merge base with main, or undefined before it lands there.
function baseline(): string[] | undefined {
  const base = git(['merge-base', 'HEAD', 'origin/main']).trim();

  // ls-tree prints nothing for a path the commit lacks; any other git failure throws.
  const onBase = git(['ls-tree', '--name-only', base, '--', allowlistPath]);

  return onBase.trim() === ''
    ? undefined
    : readAllowlist(git(['show', `${base}:${allowlistPath}`]));
}

function flaggedFiles(): Set<string> {
  const report = reportSchema.parse(
    JSON.parse(measureFindings(root, allowlistPath)),
  );

  return new Set(
    report.diagnostics
      .filter((finding): boolean => finding.code === 'argo(kit-styling)')
      .map((finding): string => relative(root, join(root, finding.filename))),
  );
}

const current = readAllowlist(readFileSync(join(root, allowlistPath), 'utf8'));

const problems = allowlistProblems({
  current,
  baseline: baseline(),
  flagged: flaggedFiles(),
});

for (const problem of problems) console.error(problem);

console.log(
  `check-kit-styling-allowlist: ${current.length} files, ${problems.length} problems`,
);

process.exit(problems.length > 0 ? 1 : 0);
