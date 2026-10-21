/*
 * Where a story file sits decides its whole title, not just the group it starts with, so the sidebar
 * tree cannot drift from the folders it is drawn from (ADR-0040).
 */
const kitSource = 'packages/kit/src/';

const clientSource = 'packages/client/src/';

// The first title after `const meta` is the story file's title; a Variation's own titles come later.
const metaTitle = /const meta\b[\s\S]*?\btitle: '([^']+)'/;

const story = /\.stories\.tsx$/;

export const pascal = (name: string): string =>
  name
    .split('-')
    .map((part): string => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

/*
 * Exception 2: an aspect segment is a reader's phrase, so `list-grouping` may read `Grouping` or
 * `Group at top`. Both spellings are accepted; nothing else in a title may be written freehand.
 */
const sentence = (name: string): string =>
  [pascal(name.split('-')[0] ?? ''), ...name.split('-').slice(1)].join(' ');

// A story file's name: the component it draws, and the aspect of it this file holds, when its siblings share one.
interface Leaf {
  name: string;
  aspect: string | undefined;
}

// A file named after its own folder draws the component; one named `<folder>-<aspect>` draws an aspect of it.
const leafOf = (dirs: readonly string[], base: string): Leaf => {
  const folder = dirs.at(-1);

  if (folder !== undefined && base.startsWith(`${folder}-`))
    return { name: pascal(folder), aspect: base.slice(folder.length + 1) };

  return { name: pascal(base), aspect: undefined };
};

const leafTitles = ({ name, aspect }: Leaf): string[] =>
  aspect === undefined
    ? [name]
    : [`${name}/${pascal(aspect)}`, `${name}/${sentence(aspect)}`];

/*
 * What a title must be. A path that names its own component derives the whole title; a path that
 * cannot — a screen, a test — derives everything up to the segment only a reader can write.
 */
type Expected =
  | { kind: 'exact'; titles: string[] }
  | { kind: 'prefix'; prefix: string; seed: string; why: string }
  | { kind: 'none' };

const titlesUnder = (
  root: string,
  dirs: readonly string[],
  base: string,
): string[] =>
  leafTitles(leafOf(dirs, base)).map((leaf): string => `${root}/${leaf}`);

const exactly = (
  root: string,
  dirs: readonly string[],
  base: string,
): Expected => ({ kind: 'exact', titles: titlesUnder(root, dirs, base) });

/*
 * Exception 1: a screen's last segment is the page title a reader sees in the product — `New Session`,
 * not `SessionNewView` — which no folder name can give. The section and the depth are checked; the
 * page title is the author's, so do not "fix" it to match the file.
 */
const screenExpected = (dirs: readonly string[], base: string): Expected => ({
  kind: 'prefix',
  prefix: `Screens/${pascal(dirs[1] ?? '')}/`,
  seed: `Screens/${pascal(dirs[1] ?? '')}/${pascal(base)}`,
  why: "a screen's last segment is its visible page title, which the folder cannot give",
});

/*
 * A test title mirrors its subject's title, which #1200 derives; until then only the root is checked,
 * and the aspect segment #1197 gave each file keeps whatever reads best.
 */
const testExpected = (dirs: readonly string[], base: string): Expected => ({
  kind: 'prefix',
  prefix: 'Tests/',
  seed: `Tests/${leafOf(dirs, base).name}`,
  why: "a test's title mirrors its subject's, which #1200 derives",
});

// Only a view of a route, or a file in `screens/`, draws a screen; `diff-view` is a component.
const screenView = /-(?:list|detail|new|edit)-view$|-page$/;

interface Rule {
  test: (dirs: readonly string[], base: string) => boolean;
  expected: (dirs: readonly string[], base: string) => Expected;
}

const testStories: Rule = {
  test: (_dirs, base) => base.endsWith('.test'),
  expected: (dirs, base) => testExpected(dirs, base.replace(/\.test$/, '')),
};

// The kit is the design system: its primitives carry their category folder, everything else sits beside them.
const kitRules: readonly Rule[] = [
  testStories,
  {
    test: (dirs) => dirs[0] === 'primitives',
    expected: (dirs, base) =>
      exactly(
        `Design System/Primitives/${pascal(dirs[1] ?? '')}`,
        dirs.slice(2),
        base,
      ),
  },
  {
    test: () => true,
    expected: (dirs, base) => exactly('Design System', dirs, base),
  },
];

const isProduct = (dirs: readonly string[]): boolean =>
  dirs[0] === 'lib' && dirs[1] === 'product';

// The first rule whose test matches the path gives the title that path expects.
const clientRules: readonly Rule[] = [
  testStories,
  {
    test: (dirs, base) => dirs[0] === 'screens' || screenView.test(base),
    expected: screenExpected,
  },
  {
    test: isProduct,
    expected: (dirs, base) =>
      exactly('Design System/Patterns', dirs.slice(2), base),
  },
  {
    test: (dirs) => dirs[0] === 'features',
    expected: (dirs, base) =>
      exactly(pascal(dirs[1] ?? ''), dirs.slice(2), base),
  },
];

// A story file's package decides which rules place it: the kit draws the design system, the client the screens.
const packages: readonly [string, readonly Rule[]][] = [
  [kitSource, kitRules],
  [clientSource, clientRules],
];

// `pnpm new:story` names a file by its absolute path, so the package's folder may sit anywhere in it.
const packageOf = (file: string): [string, readonly Rule[]] | undefined =>
  packages.find(([source]): boolean => file.includes(source));

// Where a story file sits: the folders inside its package, and the file's own name without its suffixes.
interface Path {
  dirs: string[];
  base: string;
}

const pathIn = (source: string, file: string): Path => {
  const parts = file.slice(file.indexOf(source) + source.length).split('/');

  return {
    dirs: parts.slice(0, -1),
    base: (parts.at(-1) ?? '').replace(story, ''),
  };
};

// A story outside every rule's folder would start a new top-level group, so no title belongs to it.
const expectedIn = (rules: readonly Rule[], { dirs, base }: Path): Expected =>
  rules
    .find((rule): boolean => rule.test(dirs, base))
    ?.expected(dirs, base) ?? { kind: 'none' };

// The title the file's own path derives, which the check compares and `pnpm new:story` writes.
const expectedTitle = (file: string): Expected => {
  const found = packageOf(file);

  return found === undefined
    ? { kind: 'none' }
    : expectedIn(found[1], pathIn(found[0], file));
};

/*
 * The title `pnpm new:story` writes. A screen's page title and a test's subject are the author's, so
 * the derived one is a starting point there and the exact title everywhere else.
 */
const firstTitle = (expected: Expected): string | undefined => {
  if (expected.kind === 'exact') return expected.titles[0];

  return expected.kind === 'prefix' ? expected.seed : undefined;
};

export const derivedStoryTitle = (file: string): string => {
  const story = file.replace(/\.(?:native\.)?tsx?$/, '.stories.tsx');

  const title = firstTitle(expectedTitle(story));

  if (title === undefined)
    throw new Error(`${file}: no story group belongs to this folder`);

  return title;
};

const quoted = (value: string): string => `'${value}'`;

const exactProblem = (
  file: string,
  title: string,
  titles: string[],
): string[] =>
  titles.includes(title)
    ? []
    : [`${file}: expected ${quoted(titles[0] ?? '')}, found ${quoted(title)}`];

const matchesPrefix = (title: string, prefix: string): boolean =>
  title.startsWith(prefix) && title.slice(prefix.length).length > 0;

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

const titleProblem = (file: string, title: string): string[] => {
  const expected = expectedTitle(file);

  if (expected.kind === 'none')
    return [`${file}: no story group belongs to this folder`];

  return expected.kind === 'exact'
    ? exactProblem(file, title, expected.titles)
    : prefixProblem(file, title, expected);
};

const isPlacedStory = (file: string): boolean =>
  story.test(file) && packageOf(file) !== undefined;

const metaTitleProblem = (file: string, source: string): string[] => {
  const title = metaTitle.exec(source)?.[1];

  return title === undefined
    ? [`${file}: the story meta needs a literal title`]
    : titleProblem(file, title);
};

export const storyTitleProblems = (file: string, source: string): string[] =>
  isPlacedStory(file) ? metaTitleProblem(file, source) : [];

// A story file and what it holds, as the checker reads it off disk.
export interface StoryFile {
  file: string;
  source: string;
}

// A placed story file's title; an unplaced file or a missing literal has none.
const placedTitle = ({ file, source }: StoryFile): string | undefined =>
  isPlacedStory(file) ? metaTitle.exec(source)?.[1] : undefined;

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
