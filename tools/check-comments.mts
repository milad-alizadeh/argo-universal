import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commentProblems } from './comment-rules.mts';

const root = fileURLToPath(new URL('..', import.meta.url));
// The checker and its tests spell out the comments it reports.
const own = new Set(
  ['check-comments.mts', 'comment-rules.mts', 'comment-rules.test.mts'].map(
    (name) => resolve(root, 'tools', name),
  ),
);

const trackedSources = (): string[] =>
  execFileSync('git', ['ls-files', '--', '*.ts', '*.tsx', '*.mts', '*.mjs'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);

const fileProblems = (file: string): string[] =>
  readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, index) =>
      commentProblems(line).map(
        (message) => `${relative(root, file)}:${index + 1}: ${message}`,
      ),
    );

const requested = process.argv.slice(2);
const files = (requested.length > 0 ? requested : trackedSources())
  .map((file) => resolve(root, file))
  .filter((file) => !/\.gen\./.test(file) && !own.has(file))
  .sort();
const problems = files.flatMap(fileProblems);

for (const problem of problems) console.error(problem);
console.log(
  `check-comments: ${files.length} files, ${problems.length} problems`,
);
process.exit(problems.length > 0 ? 1 : 0);
