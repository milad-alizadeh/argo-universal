// Where a story file sits decides the Storybook group its title starts with, so the sidebar keeps one tree.
const clientSource = 'packages/client/src/';
// The first title after `const meta` is the story file's title; a Variation's own titles come later.
const metaTitle = /const meta\b[\s\S]*?\btitle: '([^']+)'/;
const story = /\.stories\.tsx$/;
const feature = /^features\/([^/]+)\//;

// A feature's components group under its own name; frame draws the Shell.
const featureGroups: Readonly<Record<string, string>> = { frame: 'Shell' };

const pascal = (name: string): string =>
  name
    .split('-')
    .map((part): string => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const groupOf = (name: string): string => featureGroups[name] ?? pascal(name);

const featureGroup = (path: string): string[] => [
  'Screens/',
  `${groupOf(feature.exec(path)?.[1] ?? '')}/`,
];

// The first rule whose test matches the path gives its allowed groups.
const rules: readonly {
  test: (path: string) => boolean;
  groups: (path: string) => string[];
}[] = [
  {
    test: (path) => path.endsWith('.test.stories.tsx'),
    groups: () => ['Tests/'],
  },
  {
    test: (path) => path.startsWith('lib/generic/primitives/'),
    groups: () => ['Design System/Primitives/'],
  },
  {
    test: (path) => path.startsWith('lib/generic/'),
    groups: () => ['Design System/'],
  },
  {
    test: (path) => path.startsWith('lib/product/'),
    groups: () => ['Shared/'],
  },
  { test: (path) => feature.test(path), groups: featureGroup },
];

const allowedGroups = (path: string): string[] =>
  rules.find((rule) => rule.test(path))?.groups(path) ?? [];

const quoted = (group: string): string => `'${group}'`;

const titleProblem = (file: string, title: string): string[] => {
  const groups = allowedGroups(file.slice(clientSource.length));
  const fits = groups.some((group) => title.startsWith(group));
  if (groups.length === 0 || fits) return [];
  const expected = groups.map(quoted).join(' or ');
  return [`${file}: title '${title}' must start with ${expected}`];
};

const isClientStory = (file: string): boolean =>
  story.test(file) && file.startsWith(clientSource);

const metaTitleProblem = (file: string, source: string): string[] => {
  const title = metaTitle.exec(source)?.[1];
  return title === undefined
    ? [`${file}: the story meta needs a literal title`]
    : titleProblem(file, title);
};

export const storyTitleProblems = (file: string, source: string): string[] =>
  isClientStory(file) ? metaTitleProblem(file, source) : [];
