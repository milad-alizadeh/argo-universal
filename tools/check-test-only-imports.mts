import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { testOnlyImportProblems } from './test-only-import-rules.mts';
import { root, trackedFiles } from './tracked-files.mts';

const files = trackedFiles(['*.ts', '*.tsx']);

const problems = files.flatMap((file): string[] =>
  testOnlyImportProblems(file, readFileSync(resolve(root, file), 'utf8')),
);

for (const problem of problems) console.error(problem);

console.log(
  `check-test-only-imports: ${files.length} files, ${problems.length} problems`,
);

process.exit(problems.length > 0 ? 1 : 0);
