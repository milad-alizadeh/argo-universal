import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { suffixProblems, type Sources } from './test-suffix-rules.mts';
import { root, trackedFiles } from './tracked-files.mts';

const files = trackedFiles(['*.ts', '*.tsx', '*.mts']);

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
