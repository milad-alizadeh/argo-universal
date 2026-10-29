import { storySuffix } from './story-file.mts';
import { baseOf, dirOf, type StoryPath } from './story-title-path.mts';

export type StoryTitles = ReadonlyMap<string, string>;

export const testFile = /\.test$/;

// The words a `-` name is built from, which decide where a test file's name stops being its subject's.
const words = (base: string): readonly string[] => base.split('-');

// How many leading words two names share: the whole of a subject's name, or the stem a sibling shares.
const sharedWords = (
  base: readonly string[],
  parts: readonly string[],
): number => {
  const differs = base.findIndex(
    (word, index): boolean => parts[index] !== word,
  );

  return differs === -1 ? base.length : differs;
};

// A test's subject: the title it mirrors, and the words of its own name that name the aspect.
export interface Subject {
  title: string;
  aspect: readonly string[];
}

/*
 * The story files a test file sits among, and the words of its own name, which together find its subject.
 */
export interface Neighbours {
  titles: StoryTitles;
  dir: string;
  folder: string;
  parts: readonly string[];
}

/*
 * What is left of the test's name once its subject's own words are taken: `plugin-canvas` under
 * `plugin-registry.stories.tsx` is the registry's `Canvas`.
 */
const subjectOf = (
  { parts }: Neighbours,
  title: string,
  base: string,
): Subject => ({ title, aspect: parts.slice(sharedWords(words(base), parts)) });

// The story whose name the test's name extends: `composer-send` beside `composer.stories.tsx`.
const extendedSubject = ({
  titles,
  dir,
  parts,
}: Neighbours): Subject | undefined => {
  for (let taken = parts.length; taken > 0; taken -= 1) {
    const base = parts.slice(0, taken).join('-');
    const title = titles.get(`${dir}${base}${storySuffix}`);

    if (title !== undefined) return { title, aspect: parts.slice(taken) };
  }

  return undefined;
};

// One neighbour as the subject: the title it declares, and the words of its name the test shares.
const subjectIn = (
  neighbours: Neighbours,
  file: string,
): Subject | undefined => {
  const title = neighbours.titles.get(file);

  return title === undefined
    ? undefined
    : subjectOf(neighbours, title, baseOf(file));
};

// The folder's own story, which a test named for one part of it belongs under.
const folderSubject = (neighbours: Neighbours): Subject | undefined =>
  subjectIn(neighbours, `${neighbours.dir}${neighbours.folder}${storySuffix}`);

const storiesIn = (titles: StoryTitles, dir: string): string[] =>
  [...titles.keys()].filter(
    (file): boolean =>
      file.startsWith(dir) && !file.slice(dir.length).includes('/'),
  );

// A route folder (`$id/`) is named for nothing, so the view of its own route is the subject there.
const routeView = /-detail-view$/;

const detailViewIn = (titles: StoryTitles, dir: string): string | undefined =>
  storiesIn(titles, dir).find((file): boolean => routeView.test(baseOf(file)));

const routeDetailView = ({
  titles,
  dir,
  folder,
}: Neighbours): string | undefined =>
  folder.startsWith('$') ? detailViewIn(titles, dir) : undefined;

const routeSubject = (neighbours: Neighbours): Subject | undefined => {
  const view = routeDetailView(neighbours);

  return view === undefined ? undefined : subjectIn(neighbours, view);
};

export const subjectBeside = (neighbours: Neighbours): Subject | undefined =>
  extendedSubject(neighbours) ??
  folderSubject(neighbours) ??
  routeSubject(neighbours);

// Where the test file sits, as its subject's neighbours are looked up from.
export const neighboursOf = (
  file: string,
  path: StoryPath,
  titles: StoryTitles,
): Neighbours => ({
  titles,
  dir: dirOf(file),
  folder: path.dirs.at(-1) ?? '',
  parts: words(path.base.replace(testFile, '')),
});
