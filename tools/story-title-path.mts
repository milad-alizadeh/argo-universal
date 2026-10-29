import { storyPath } from './story-file.mts';

const kitSource = 'packages/kit/src/';

const clientSource = 'packages/client/src/';

export const pascal = (name: string): string =>
  name
    .split('-')
    .map((part): string => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

// Where a story file sits: the folders inside its package, its own name, and the component its meta draws.
export interface StoryPath {
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

export const leafOf = (dirs: readonly string[], path: StoryPath): Leaf => {
  const folder = dirs.at(-1);

  if (folder !== undefined && drawsFolder(folder, path))
    return { name: pascal(folder), aspect: path.base.slice(folder.length + 1) };

  return { name: pascal(path.base), aspect: undefined };
};

export const leafTitle = ({ name, aspect }: Leaf): string =>
  aspect === undefined ? name : `${name}/${pascal(aspect)}`;

/*
 * What a title must be. A path that names its own component derives the whole title; a path that
 * cannot — a screen, a test — derives everything up to the segment only a reader can write.
 */
export type Expected =
  | { kind: 'exact'; title: string }
  | { kind: 'prefix'; prefix: string; seed: string; why: string }
  | { kind: 'none'; why: string };

// A folder no story group belongs to, with the reason a reader needs to place the file.
export const nowhere = (
  why = 'no story group belongs to this folder',
): Expected => ({
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

// Only a view of a route, or a file in `screens/`, draws a screen; `diff-view` is a component.
const screenView = /-(?:list|detail|new|edit)-view$|-page$/;

// A screen's section is the folder under `screens/`, or the feature a view belongs to.
const sectionOf = (dirs: readonly string[]): string | undefined => dirs[1];

export interface Rule {
  test: (path: StoryPath) => boolean;
  expected: (path: StoryPath) => Expected;
}

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

// The sidebar names the `fields` folder's group for what a reader does there: fill in a form.
const categoryLabels = new Map([['fields', 'Forms']]);

const categoryOf = (folder = ''): string =>
  categoryLabels.get(folder) ?? pascal(folder);

const kitRules: readonly Rule[] = [
  {
    test: ({ dirs }) => dirs[0] === 'foundations' && dirs.length > 1,
    expected: (path) =>
      titleUnder('Design System/Foundations', path.dirs.slice(1), path),
  },
  {
    test: ({ dirs }) => dirs[0] === 'primitives' && dirs.length > 2,
    expected: (path) =>
      titleUnder(
        `Design System/Primitives/${categoryOf(path.dirs[1])}`,
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
export const packageOf = (
  file: string,
): [string, readonly Rule[]] | undefined =>
  packages.find(([source]): boolean => file.includes(source));

// A story file's own name, without the `.stories.tsx` every story shares.
export const baseOf = (file: string): string =>
  (file.split('/').at(-1) ?? '').replace(storyPath, '');

/*
 * The folder a file sits in, as a whole path. `StoryPath.dirs` drops the package, so it cannot name
 * a neighbour of the file, which is what a test's subject is looked up by.
 */
export const dirOf = (file: string): string =>
  file.slice(0, file.lastIndexOf('/') + 1);

export const pathIn = (
  source: string,
  file: string,
  component: string | undefined,
): StoryPath => {
  const parts = file.slice(file.indexOf(source) + source.length).split('/');

  return { dirs: parts.slice(0, -1), base: baseOf(file), component };
};

// A story outside every rule's folder would start a new top-level group, so no title belongs to it.
export const placedIn = (rules: readonly Rule[], path: StoryPath): Expected =>
  rules.find((rule): boolean => rule.test(path))?.expected(path) ?? nowhere();
