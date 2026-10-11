import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suffixProblems, type Sources } from './test-suffix-rules.mts';

const root = fileURLToPath(new URL('..', import.meta.url));

const trackedSources = (): string[] =>
  execFileSync('git', ['ls-files', '--', '*.ts', '*.tsx', '*.mts'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);

const files = trackedSources();
const sources: Sources = new Map(
  files.map((file): [string, string] => [
    file,
    readFileSync(resolve(root, file), 'utf8'),
  ]),
);
const problems = files.flatMap((file): string[] =>
  suffixProblems(file, sources),
);

for (const problem of problems) console.error(problem);
console.log(
  `check-test-suffix: ${files.length} files, ${problems.length} problems`,
);
process.exit(problems.length > 0 ? 1 : 0);
