import {
  readStory,
  storySuffix,
  storyPath,
  type StoryFile,
} from './story-file.mts';
import { expectedTitle, type StoryTitles } from './story-title-expected.mts';
import { testFile } from './story-title-neighbours.mts';
import { baseOf, type Expected, packageOf } from './story-title-path.mts';

export { type StoryTitles } from './story-title-expected.mts';

export { pascal } from './story-title-path.mts';

const noTitles: StoryTitles = new Map();

/*
 * The title `pnpm new:story` writes. A screen's page title and a test's subject are the author's, so
 * the derived one is a starting point there and the exact title everywhere else.
 */
const firstTitle = (expected: Expected): string | undefined => {
  if (expected.kind === 'exact') return expected.title;

  return expected.kind === 'prefix' ? expected.seed : undefined;
};

// Why a path derives no title, which `pnpm new:story` reports as the folder's own problem.
const whyNowhere = (expected: Expected): string =>
  expected.kind === 'none' ? expected.why : '';

export const derivedStoryTitle = (componentFile: string): string => {
  const storyFile = componentFile.replace(/\.(?:native\.)?tsx?$/, storySuffix);

  // `pnpm new:story` writes a story for the component the file itself exports, never for its folder's.
  const expected = expectedTitle(storyFile);
  const title = firstTitle(expected);

  if (title === undefined)
    throw new Error(`${componentFile}: ${whyNowhere(expected)}`);

  return title;
};

const quoted = (value: string): string => `'${value}'`;

const exactProblem = (
  file: string,
  title: string,
  expected: string,
): string[] =>
  title === expected
    ? []
    : [`${file}: expected ${quoted(expected)}, found ${quoted(title)}`];

const matchesPrefix = (title: string, prefix: string): boolean =>
  title.startsWith(prefix) && title.length > prefix.length;

const prefixProblem = (
  file: string,
  title: string,
  { prefix, why }: { prefix: string; why: string },
): string[] => {
  const wanted = quoted(`${prefix}…`);

  return matchesPrefix(title, prefix)
    ? []
    : [`${file}: expected ${wanted}, found ${quoted(title)} — ${why}`];
};

const expectedProblem = (
  file: string,
  title: string,
  expected: Expected,
): string[] => {
  if (expected.kind === 'none') return [`${file}: ${expected.why}`];

  return expected.kind === 'exact'
    ? exactProblem(file, title, expected.title)
    : prefixProblem(file, title, expected);
};

// The meta's component says whether the file draws its folder's component or its own.
const titleProblem = (
  { file, source }: StoryFile,
  title: string,
  titles: StoryTitles,
): string[] =>
  expectedProblem(
    file,
    title,
    expectedTitle(file, readStory({ file, source }).component, titles),
  );

const isPlacedStory = (file: string): boolean =>
  storyPath.test(file) && packageOf(file) !== undefined;

const metaTitleProblem = (story: StoryFile, titles: StoryTitles): string[] => {
  const title = readStory(story).title;

  return title === undefined
    ? [`${story.file}: the story meta needs a literal title`]
    : titleProblem(story, title, titles);
};

/*
 * `titles` is every presentation story's declared title by file, which a test file's title mirrors.
 * Each of those is checked against its own path in the same pass, so a wrong one is reported there.
 */
export const storyTitleProblems = (
  file: string,
  source: string,
  titles: StoryTitles = noTitles,
): string[] =>
  isPlacedStory(file) ? metaTitleProblem({ file, source }, titles) : [];

// A placed story file's title; an unplaced file or a missing literal has none.
const placedTitle = ({ file, source }: StoryFile): string | undefined =>
  isPlacedStory(file) ? readStory({ file, source }).title : undefined;

const presentationTitle = (story: StoryFile): string | undefined =>
  testFile.test(baseOf(story.file)) ? undefined : placedTitle(story);

// What each presentation story calls itself, which is the title its own test files mirror.
export const presentationTitles = (files: readonly StoryFile[]): StoryTitles =>
  new Map(
    files.flatMap((story): [string, string][] => {
      const title = presentationTitle(story);

      return title === undefined ? [] : [[story.file, title]];
    }),
  );

const addTitle = (
  titles: Map<string, string[]>,
  story: StoryFile,
): Map<string, string[]> => {
  const title = placedTitle(story);

  if (title !== undefined)
    titles.set(title, [...(titles.get(title) ?? []), story.file]);

  return titles;
};

// The placed story files that claim each title, in the order they were read.
const filesByTitle = (files: readonly StoryFile[]): Map<string, string[]> =>
  files.reduce(addTitle, new Map<string, string[]>());

const sharedTitleProblem = (title: string, files: string[]): string[] =>
  files.length < 2
    ? []
    : [
        `title '${title}' is declared by ${files.length} files: ${files.join(', ')}`,
      ];

/*
 * Storybook merges same-titled files into one sidebar node, where a story id is unique only by
 * export name — so two files sharing a title overwrite each other's stories without saying so.
 */
export const duplicateTitleProblems = (files: readonly StoryFile[]): string[] =>
  [...filesByTitle(files)].flatMap(([title, declaring]): string[] =>
    sharedTitleProblem(title, declaring),
  );
