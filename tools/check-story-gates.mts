import { loadStoryFiles } from './story-file.mts';
import { gateProblems, type Sources } from './story-gate-rules.mts';

const files = loadStoryFiles();

/*
 * A gate that reads a component's props needs the component beside its story, and the `*-props.ts`
 * the component may take them from, so every TypeScript source is on hand before a story is read.
 */
const sources: Sources = new Map(
  loadStoryFiles(['*.ts', '*.tsx', '*.mts']).map(
    ({ file, source }): [string, string] => [file, source],
  ),
);

const problems = files.flatMap(({ file, source }): string[] =>
  gateProblems(file, source, sources),
);

for (const problem of problems) console.error(problem);

console.log(
  `check-story-gates: ${files.length} files, ${problems.length} problems`,
);

process.exit(problems.length > 0 ? 1 : 0);
