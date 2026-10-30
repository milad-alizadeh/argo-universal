import { loadStoryFiles } from './story-files.mts';
import {
  duplicateTitleProblems,
  presentationTitles,
  storyTitleProblems,
} from './story-title-rules.mts';

const stories = loadStoryFiles();

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
  `check-story-titles: ${stories.length} files, ${problems.length} problems`,
);

process.exit(problems.length > 0 ? 1 : 0);
