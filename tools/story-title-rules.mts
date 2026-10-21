/*
 * Where a story file sits decides its whole title, not just the group it starts with, so the sidebar
 * tree cannot drift from the folders it is drawn from (ADR-0040).
 */
const kitSource = 'packages/kit/src/';

const clientSource = 'packages/client/src/';

// The first title after `const meta` is the story file's title; a Variation's own titles come later.
const metaTitle = /const meta\b[\s\S]*?\btitle: '([^']+)'/;

const story = /\.stories\.tsx$/;

// The component a story's meta draws, which says whether the file draws its folder's component or its own.
const metaComponent = /const meta\b[\s\S]*?\bcomponent: (\w+)/;

export const pascal = (name: string): string =>
  name
    .split('-')
    .map((part): string => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

// Where a story file sits: the folders inside its package, its own name, and the component its meta draws.
interface StoryPath {
  dirs: string[];
  base: string;
  component: string | undefined;
}

// A story file's name: the component it draws, and the aspect of it this file holds, when its siblings share one.
interface Leaf {
  name: string;
  aspect: string | undefined;
}

/*
 * A file draws an aspect of its folder's component when it is named `<folder>-<aspect>` and its meta
 * draws that folder's component: `list-tiles.stories.tsx` draws `List`, so it is `List/Tiles`. A file
 * that draws a component of its own keeps its own node, however its name reads beside the folder's.
 */
const drawsFolder = (folder: string, { base, component }: StoryPath): boolean =>
  base.startsWith(`${folder}-`) && component === pascal(folder);

const leafOf = (dirs: readonly string[], path: StoryPath): Leaf => {
  const folder = dirs.at(-1);

  if (folder !== undefined && drawsFolder(folder, path))
    return { name: pascal(folder), aspect: path.base.slice(folder.length + 1) };

  return { name: pascal(path.base), aspect: undefined };
};

const leafTitle = ({ name, aspect }: Leaf): string =>
  aspect === undefined ? name : `${name}/${pascal(aspect)}`;

/*
 * What a title must be. A path that names its own component derives the whole title; a path that
 * cannot — a screen, a test — derives everything up to the segment only a reader can write.
 */
type Expected =
  | { kind: 'exact'; title: string }
  | { kind: 'prefix'; prefix: string; seed: string; why: string }
  | { kind: 'none'; why: string };

// A folder no story group belongs to, with the reason a reader needs to place the file.
const nowhere = (why = 'no story group belongs to this folder'): Expected => ({
  kind: 'none',
  why,
});

const titleUnder = (
  root: string,
  dirs: readonly string[],
  path: StoryPath,
): Expected => ({
  kind: 'exact',
  title: `${root}/${leafTitle(leafOf(dirs, path))}`,
});

/*
 * Exception 1: a screen's last segment is the page title a reader sees in the product — `New Session`,
 * not `SessionNewView` — which no folder name can give. The section and the depth are checked; the
 * page title is the author's, so do not "fix" it to match the file.
 */
const screenExpected = (section: string, base: string): Expected => ({
  kind: 'prefix',
  prefix: `Screens/${pascal(section)}/`,
  seed: `Screens/${pascal(section)}/${pascal(base)}`,
  why: "a screen's last segment is its visible page title, which the folder cannot give",
});

/*
 * Exception 2: a test title mirrors its subject's title, which #1200 derives; until then only the
 * root is checked, and the aspect segment #1197 gave each file keeps whatever reads best.
 */
const testExpected = (dirs: readonly string[], path: StoryPath): Expected => ({
  kind: 'prefix',
  prefix: 'Tests/',
  seed: `Tests/${leafOf(dirs, path).name}`,
  why: "a test's title mirrors its subject's, which #1200 derives",
});

// Only a view of a route, or a file in `screens/`, draws a screen; `diff-view` is a component.
const screenView = /-(?:list|detail|new|edit)-view$|-page$/;

// A screen's section is the folder under `screens/`, or the feature a view belongs to.
const sectionOf = (dirs: readonly string[]): string | undefined => dirs[1];

interface Rule {
  test: (path: StoryPath) => boolean;
  expected: (path: StoryPath) => Expected;
}

const testStories: Rule = {
  test: ({ base }) => base.endsWith('.test'),
  expected: (path) =>
    testExpected(path.dirs, {
      ...path,
      base: path.base.replace(/\.test$/, ''),
    }),
};

/*
 * One depth per kit root (#1199): a primitive is `Design System/Primitives/<Category>/<Name>`, four
 * segments drawn from `primitives/<category>/<name>/`, and a foundation — a token scale no component
 * owns — is `Design System/Foundations/<Topic>` from `foundations/<topic>/`. The kit has no third root,
 * so a story anywhere else in it has nowhere to go and says where the two homes are.
 */
const primitivesHome =
  'a kit primitive lives in `primitives/<category>/<name>/`, so its title carries its category';

const kitHome =
  'a kit story is a primitive in `primitives/<category>/<name>/` or a foundation in `foundations/<topic>/`';

const kitRules: readonly Rule[] = [
  testStories,
  {
    test: ({ dirs }) => dirs[0] === 'foundations' && dirs.length > 1,
    expected: (path) =>
      titleUnder('Design System/Foundations', path.dirs.slice(1), path),
  },
  {
    test: ({ dirs }) => dirs[0] === 'primitives' && dirs.length > 2,
    expected: (path) =>
      titleUnder(
        `Design System/Primitives/${pascal(path.dirs[1] ?? '')}`,
        path.dirs.slice(2),
        path,
      ),
  },
  {
    test: ({ dirs }) => dirs[0] === 'primitives',
    expected: () => nowhere(primitivesHome),
  },
  { test: () => true, expected: () => nowhere(kitHome) },
];

const isProduct = ({ dirs }: StoryPath): boolean =>
  dirs[0] === 'lib' && dirs[1] === 'product';

const isScreenFolder = ({ dirs }: StoryPath): boolean =>
  dirs[0] === 'screens' && sectionOf(dirs) !== undefined;

const isFeatureScreen = ({ dirs, base }: StoryPath): boolean =>
  dirs[0] === 'features' &&
  sectionOf(dirs) !== undefined &&
  screenView.test(base);

// The first rule whose test matches the path gives the title that path expects.
const clientRules: readonly Rule[] = [
  testStories,
  // A route's own folder in `screens/` draws that page (#761).
  {
    test: isScreenFolder,
    expected: ({ dirs, base }) => screenExpected(sectionOf(dirs) ?? '', base),
  },
  // A feature may own a route's view; the feature is then the section it lands in.
  {
    test: isFeatureScreen,
    expected: ({ dirs, base }) => screenExpected(sectionOf(dirs) ?? '', base),
  },
  {
    test: isProduct,
    expected: (path) =>
      titleUnder('Design System/Patterns', path.dirs.slice(2), path),
  },
  {
    test: ({ dirs }) => dirs[0] === 'features' && dirs.length > 1,
    expected: (path) =>
      titleUnder(pascal(path.dirs[1] ?? ''), path.dirs.slice(2), path),
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

const pathIn = (
  source: string,
  file: string,
  component: string | undefined,
): StoryPath => {
  const parts = file.slice(file.indexOf(source) + source.length).split('/');

  return {
    dirs: parts.slice(0, -1),
    base: (parts.at(-1) ?? '').replace(story, ''),
    component,
  };
};

// A story outside every rule's folder would start a new top-level group, so no title belongs to it.
const expectedIn = (rules: readonly Rule[], path: StoryPath): Expected =>
  rules.find((rule): boolean => rule.test(path))?.expected(path) ?? nowhere();

// The title the file's own path derives, which the check compares and `pnpm new:story` writes.
const expectedTitle = (file: string, component?: string): Expected => {
  const found = packageOf(file);

  return found === undefined
    ? nowhere()
    : expectedIn(found[1], pathIn(found[0], file, component));
};

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
  const storyFile = componentFile.replace(
    /\.(?:native\.)?tsx?$/,
    '.stories.tsx',
  );

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

const titleProblem = (file: string, source: string, title: string): string[] =>
  expectedProblem(
    file,
    title,
    expectedTitle(file, metaComponent.exec(source)?.[1]),
  );

const isPlacedStory = (file: string): boolean =>
  story.test(file) && packageOf(file) !== undefined;

const metaTitleProblem = (file: string, source: string): string[] => {
  const title = metaTitle.exec(source)?.[1];

  return title === undefined
    ? [`${file}: the story meta needs a literal title`]
    : titleProblem(file, source, title);
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
