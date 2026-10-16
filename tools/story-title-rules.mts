// Where a story file sits decides the Storybook group its title starts with, so the sidebar keeps one tree.
const clientSource = 'packages/client/src/';

// The first title after `const meta` is the story file's title; a Variation's own titles come later.
const metaTitle = /const meta\b[\s\S]*?\btitle: '([^']+)'/;

const story = /\.stories\.tsx$/;

const feature = /^features\/([^/]+)\//;

// A feature's components group under its own name.

const pascal = (name: string): string =>
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
  // A route's own folder in screens/ draws that page (#761).
  { test: (path) => path.startsWith('screens/'), groups: () => ['Screens/'] },
];

// A story outside every rule's folder would start a new top-level group, so it has none.
const allowedGroups = (path: string): string[] =>
  rules.find((rule) => rule.test(path))?.groups(path) ?? [];

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
  const groups = allowedGroups(file.slice(clientSource.length));

  return groups.length === 0
    ? [`${file}: no story group belongs to this folder`]
    : groupProblem({ file, title, groups });
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
