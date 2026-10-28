import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { commentProblems } from './comment-rules.mts';
import { root, trackedFiles } from './tracked-files.mts';

// The checker and its tests spell out the comments it reports.
const own = new Set(
  ['check-comments.mts', 'comment-rules.mts', 'comment-rules.test.mts'].map(
    (name): string => resolve(root, 'tools', name),
  ),
);

const fileProblems = (file: string): string[] =>
  readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, index): string[] =>
      commentProblems(line).map(
        (message): string => `${relative(root, file)}:${index + 1}: ${message}`,
      ),
    );

const requested = process.argv.slice(2);

const files = (
  requested.length > 0
    ? requested
    : trackedFiles(['*.ts', '*.tsx', '*.mts', '*.mjs'])
)
  .map((file): string => resolve(root, file))
  .filter(
    (file): boolean =>
      existsSync(file) && !/\.gen\./.test(file) && !own.has(file),
  )
  .sort();

const problems = files.flatMap(fileProblems);

for (const problem of problems) console.error(problem);

console.log(
  `check-comments: ${files.length} files, ${problems.length} problems`,
);

process.exit(problems.length > 0 ? 1 : 0);
