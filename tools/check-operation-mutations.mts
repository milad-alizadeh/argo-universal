import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { operationMutationProblems } from './operation-mutation-rules.mts';
import { root, trackedFiles } from './tracked-files.mts';

const requested = process.argv.slice(2);

const sources =
  requested.length > 0
    ? requested
    : trackedFiles(['packages/engine/src/*'], { untracked: true });

const files = sources
  .map((file): string => relative(root, resolve(root, file)))
  .filter(
    (file): boolean =>
      /\.[cm]?[jt]sx?$/.test(file) && !/\.(?:test|stories)\./.test(file),
  );

const problems = files.flatMap((file): string[] =>
  operationMutationProblems(file, readFileSync(resolve(root, file), 'utf8')),
);

for (const problem of problems) console.error(problem);

console.log(
  `check-operation-mutations: ${files.length} files, ${problems.length} problems`,
);

process.exit(problems.length > 0 ? 1 : 0);
