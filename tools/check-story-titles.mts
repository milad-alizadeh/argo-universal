import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  duplicateTitleProblems,
  presentationTitles,
  type StoryFile,
  storyTitleProblems,
} from './story-title-rules.mts';
import { root, trackedFiles } from './tracked-files.mts';

const files = trackedFiles(['*.stories.tsx'], { untracked: true });

const stories: StoryFile[] = files.map((file): StoryFile => ({
  file,
  source: readFileSync(resolve(root, file), 'utf8'),
}));

// A test file's title mirrors its subject's, so every presentation title is read before any is checked.
const titles = presentationTitles(stories);

const problems = [
  ...stories.flatMap(({ file, source }): string[] =>
    storyTitleProblems(file, source, titles),
  ),
  ...duplicateTitleProblems(stories),
];

for (const problem of problems) console.error(problem);

console.log(
  `check-story-titles: ${files.length} files, ${problems.length} problems`,
);

process.exit(problems.length > 0 ? 1 : 0);
