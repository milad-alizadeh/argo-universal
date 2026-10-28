import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { operationMutationProblems } from './operation-mutation-rules.mts';
import { root, trackedFiles } from './tracked-files.mts';

const files = trackedFiles(['packages/engine/src/*'], {
  untracked: true,
}).filter(
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
