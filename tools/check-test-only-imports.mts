import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { testOnlyImportProblems } from './test-only-import-rules.mts';

const root = fileURLToPath(new URL('..', import.meta.url));

const files = execFileSync('git', ['ls-files', '--', '*.ts', '*.tsx'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\n')
  .filter((file): boolean => file !== '' && existsSync(resolve(root, file)));

const problems = files.flatMap((file): string[] =>
  testOnlyImportProblems(file, readFileSync(resolve(root, file), 'utf8')),
);

for (const problem of problems) console.error(problem);

console.log(
  `check-test-only-imports: ${files.length} files, ${problems.length} problems`,
);

process.exit(problems.length > 0 ? 1 : 0);
