/*
 * A story title derives from the component's path, never written freehand (ADR-0040).
 * The path is read from the first `src/` segment on, so the kit's move to `packages/kit` in #1210 changes nothing here.
 */
const pascal = (name: string): string =>
  name
    .split('-')
    .map((part): string => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const sourceRelative = (path: string): string => {
  const marker = path.lastIndexOf('/src/');

  return marker === -1 ? path : path.slice(marker + '/src/'.length);
};

const folders = (path: string): string[] => path.split('/').slice(0, -1);

// A file is named for the component it draws, so the file names the subject.
const subject = (file: string): string => pascal(file.replace(/\.tsx?$/, ''));

interface Placement {
  parts: string[];
  file: string;
}

type Derivation = (placement: Placement) => string | undefined;

// A kit primitive is always four segments: its category folder is the third.
const category = (parts: string[]): string | undefined => {
  const at = parts.indexOf('primitives');

  return at === -1 ? undefined : parts[at + 1];
};

const primitive: Derivation = ({ parts, file }) => {
  const group = category(parts);

  return group === undefined
    ? undefined
    : `Design System/Primitives/${pascal(group)}/${subject(file)}`;
};

const kit: Derivation = ({ parts, file }) =>
  parts[0] === 'lib' && parts[1] === 'generic'
    ? `Design System/${subject(file)}`
    : undefined;

// `Shared` becomes `Design System/Patterns` in Spec 0021's ticket 5; the title check still demands `Shared` today.
const pattern: Derivation = ({ parts, file }) =>
  parts[0] === 'lib' && parts[1] === 'product'
    ? `Shared/${subject(file)}`
    : undefined;

// Only a `*-view`, a `*-page` or a file in `screens/` may draw a screen.
const drawsScreen = (file: string): boolean =>
  /-(?:view|page)\.tsx?$/.test(file);

const featureTitle = ({ parts, file }: Placement): string => {
  const name = pascal(parts[1] ?? '');

  return drawsScreen(file)
    ? `Screens/${name}/${subject(file)}`
    : `${name}/${subject(file)}`;
};

const feature: Derivation = (placement) =>
  placement.parts[0] === 'features' ? featureTitle(placement) : undefined;

const screen: Derivation = ({ parts, file }) =>
  parts[0] === 'screens'
    ? `Screens/${pascal(parts[1] ?? '')}/${subject(file)}`
    : undefined;

const derivations: Derivation[] = [primitive, kit, pattern, feature, screen];

/*
 * The Storybook title for a component at this path, or undefined when its folder belongs to no story group.
 * A story outside every group would start a new top-level root, which the sidebar order does not name.
 */
const placementOf = (relative: string): Placement => ({
  parts: folders(relative),
  file: relative.split('/').at(-1) ?? '',
});

export function storyTitle(componentPath: string): string | undefined {
  const placement = placementOf(sourceRelative(componentPath));

  return derivations
    .map((derive): string | undefined => derive(placement))
    .find((title): boolean => title !== undefined);
}

// The story file sits beside the component it draws.
export const storyPath = (componentPath: string): string =>
  componentPath.replace(/\.tsx$/, '.stories.tsx');

export const componentName = (componentPath: string): string =>
  pascal((componentPath.split('/').at(-1) ?? '').replace(/\.tsx$/, ''));
