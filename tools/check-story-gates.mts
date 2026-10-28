import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gateProblems, type Sources } from './story-gate-rules.mts';
import { root, trackedFiles } from './tracked-files.mts';

const files = trackedFiles(['*.stories.tsx']);

/*
 * A gate that reads a component's props needs the component beside its story, and the `*-props.ts`
 * the component may take them from, so every TypeScript source is on hand before a story is read.
 */
const sources: Sources = new Map(
  trackedFiles(['*.ts', '*.tsx', '*.mts']).map((file): [string, string] => [
    file,
    readFileSync(resolve(root, file), 'utf8'),
  ]),
);

const problems = files.flatMap((file): string[] =>
  gateProblems(file, sources.get(file) ?? '', sources),
);

for (const problem of problems) console.error(problem);

console.log(
  `check-story-gates: ${files.length} files, ${problems.length} problems`,
);

process.exit(problems.length > 0 ? 1 : 0);
