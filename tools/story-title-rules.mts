// Where a story file sits decides the Storybook group its title starts with, so the sidebar keeps one tree.
const kitSource = 'packages/kit/src/';

const clientSource = 'packages/client/src/';

// The first title after `const meta` is the story file's title; a Variation's own titles come later.
const metaTitle = /const meta\b[\s\S]*?\btitle: '([^']+)'/;

const story = /\.stories\.tsx$/;

const feature = /^features\/([^/]+)\//;

// A feature's components group under its own name.

export const pascal = (name: string): string =>
  name
    .split('-')
    .map((part): string => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

// Only a view, a page or a file in `screens/` may draw a screen.
const screenStory = /(?:-view|-page)\.stories\.tsx$|\/screens\//;

const screenGroups = (path: string): string[] =>
  screenStory.test(path) ? ['Screens/'] : [];

const featureGroup = (path: string): string[] => [
  ...screenGroups(path),
  `${pascal(feature.exec(path)?.[1] ?? '')}/`,
];

interface Rule {
  test: (path: string) => boolean;
  groups: (path: string) => string[];
}

const testStories: Rule = {
  test: (path) => path.endsWith('.test.stories.tsx'),
  groups: () => ['Tests/'],
};

// The kit is the design system: its primitives are the sidebar's own root, everything else sits beside them.
const kitRules: readonly Rule[] = [
  testStories,
  {
    test: (path) => path.startsWith('primitives/'),
    groups: () => ['Design System/Primitives/'],
  },
  { test: () => true, groups: () => ['Design System/'] },
];

// The first rule whose test matches the path gives its allowed groups.
const clientRules: readonly Rule[] = [
  testStories,
  {
    test: (path) => path.startsWith('lib/product/'),
    groups: () => ['Shared/'],
  },
  { test: (path) => feature.test(path), groups: featureGroup },
  // A route's own folder in screens/ draws that page (#761).
  { test: (path) => path.startsWith('screens/'), groups: () => ['Screens/'] },
];

// A story file's package decides which rules place it: the kit draws the design system, the client the screens.
const packages: readonly [string, readonly Rule[]][] = [
  [kitSource, kitRules],
  [clientSource, clientRules],
];

// `pnpm new:story` names a file by its absolute path, so the package's folder may sit anywhere in it.
const packageOf = (file: string): [string, readonly Rule[]] | undefined =>
  packages.find(([source]): boolean => file.includes(source));

// A story outside every rule's folder would start a new top-level group, so it has none.
const allowedGroups = (rules: readonly Rule[], path: string): string[] =>
  rules.find((rule): boolean => rule.test(path))?.groups(path) ?? [];

// Where a story file sits: the path inside its package, and the groups that path allows.
export interface StoryPlacement {
  path: string;
  groups: string[];
}

// A file in no package has no path inside one and no groups, which reads as "no group belongs here".
export const storyPlacement = (file: string): StoryPlacement => {
  const [source, rules] = packageOf(file) ?? ['', []];
  const path = file.slice(file.indexOf(source) + source.length);

  return { path, groups: allowedGroups(rules, path) };
};

const quoted = (group: string): string => `'${group}'`;

interface Placement {
  file: string;
  title: string;
  groups: string[];
}

const groupProblem = ({ file, title, groups }: Placement): string[] => {
  if (groups.some((group) => title.startsWith(group))) return [];
  const expected = groups.map(quoted).join(' or ');

  return [`${file}: title '${title}' must start with ${expected}`];
};

const titleProblem = (file: string, title: string): string[] => {
  const { groups } = storyPlacement(file);

  return groups.length === 0
    ? [`${file}: no story group belongs to this folder`]
    : groupProblem({ file, title, groups });
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
