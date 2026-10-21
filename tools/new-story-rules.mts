import { parse } from '@babel/parser';
import {
  isBooleanLiteral,
  isCallExpression,
  isIdentifier,
  isObjectExpression,
  isObjectProperty,
  isStringLiteral,
  type Node,
  type ObjectExpression,
  traverseFast,
} from '@babel/types';

// What `pnpm new:story` reads from a component's folder and writes as its story file (ADR-0040).
const clientSource = 'packages/client/src/';

const pascal = (name: string): string =>
  name
    .split(/[-_]/)
    .map((part): string => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const fileName = (path: string): string =>
  pascal((path.split('/').pop() ?? '').replace(/\.(?:native\.)?tsx?$/, ''));

// Each folder pattern with the group its components' titles start with; the first match wins.
const titleGroups: [RegExp, (folder: string) => string][] = [
  [
    /^lib\/generic\/primitives\/([^/]+)\//,
    (folder) => `Design System/Primitives/${pascal(folder)}/`,
  ],
  [/^lib\/generic\//, () => 'Design System/'],
  [/^lib\/product\//, () => 'Shared/'],
  [/^features\/([^/]+)\//, (folder) => `${pascal(folder)}/`],
  [/^/, () => 'Screens/'],
];

// Where a component sits decides its title, by the groups tools/story-title-rules.mts checks.
export function derivedTitle(componentFile: string): string {
  const path = componentFile.slice(
    componentFile.indexOf(clientSource) + clientSource.length,
  );

  const group = titleGroups.flatMap(([pattern, title]): string[] => {
    const match = pattern.exec(path);

    return match ? [title(match[1] ?? '')] : [];
  })[0];

  return `${group ?? ''}${fileName(path)}`;
}

// A prop name to the values the component's variants maps branch on, in source order.
export type Branches = Map<string, string[]>;

const literalKey = (node: Node): string | undefined => {
  if (isStringLiteral(node)) return node.value;

  return isBooleanLiteral(node) ? String(node.value) : undefined;
};

const keyName = (node: Node): string | undefined =>
  isIdentifier(node) ? node.name : literalKey(node);

const entries = (object: ObjectExpression): [string, Node][] =>
  object.properties.flatMap((property): [string, Node][] => {
    if (!isObjectProperty(property)) return [];

    const name = keyName(property.key);

    return name === undefined ? [] : [[name, property.value]];
  });

const objectEntries = (node: Node): [string, Node][] =>
  isObjectExpression(node) ? entries(node) : [];

const isVariantsCall = (node: Node): boolean =>
  isCallExpression(node) &&
  isIdentifier(node.callee) &&
  ['cva', 'tv'].includes(node.callee.name);

const variantsOf = (argument: Node): Node[] =>
  objectEntries(argument)
    .filter(([key]) => key === 'variants')
    .map(([, value]) => value);

// `cva(base, { variants })` and `tv({ variants })` both keep their branch set in a `variants` object.
function variantsObjects(source: string): Node[] {
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const found: Node[] = [];

  traverseFast(ast.program, (node): void => {
    if (isCallExpression(node) && isVariantsCall(node))
      found.push(...node.arguments.flatMap(variantsOf));
  });

  return found;
}

function addBranches(branches: Branches, variants: Node): void {
  for (const [prop, values] of objectEntries(variants)) {
    const known = branches.get(prop) ?? [];

    const added = objectEntries(values)
      .map(([value]) => value)
      .filter((value) => !known.includes(value));

    branches.set(prop, [...known, ...added]);
  }
}

// The union of every variants map in the sources, so a drawing split across files reads as one set.
export function branchesIn(sources: string[]): Branches {
  const branches: Branches = new Map();

  for (const variants of sources.flatMap(variantsObjects))
    addBranches(branches, variants);

  return branches;
}

// The kit part a props file names with `KitProps<'Part'>`, whose schema declares the props.
export const kitPartIn = (sources: string[]): string | undefined =>
  sources
    .map((source) => /KitProps<'(\w+)'>/.exec(source)?.[1])
    .find((part) => part !== undefined);

export interface Prop {
  name: string;
  required: boolean;
  kind: 'text' | 'number' | 'boolean' | 'choice' | 'opaque';
  options: string[] | undefined;
}

export interface StoryPlan {
  title: string;
  component: string;
  importPath: string;
  kitPart: string | undefined;
  props: Prop[];
  branches: Branches;
}

export interface StoryEntry {
  name: string;
  args: Record<string, string | boolean>;
}

function valueCounts(branches: [string, string[]][]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const value of branches.flatMap(([, values]) => values))
    counts.set(value, (counts.get(value) ?? 0) + 1);

  return counts;
}

const valueName = (prop: string, value: string, shared: boolean): string =>
  shared ? pascal(prop) + pascal(value) : pascal(value);

const entryFor =
  (counts: Map<string, number>) =>
  (prop: string, value: string): StoryEntry => {
    if (value === 'true') return { name: pascal(prop), args: { [prop]: true } };

    const shared = (counts.get(value) ?? 0) > 1;

    return { name: valueName(prop, value, shared), args: { [prop]: value } };
  };

// A boolean branch is named for its prop, a value branch for its value; a value two props share takes its prop's name too.
export function storyEntries(
  branches: Branches,
  declared?: Set<string>,
): StoryEntry[] {
  const kept = [...branches].filter(
    ([prop]) => declared === undefined || declared.has(prop),
  );

  const entry = entryFor(valueCounts(kept));

  return kept.flatMap(([prop, values]) =>
    values.map((value) => entry(prop, value)),
  );
}

const quote = (value: string): string => `'${value}'`;

const placeholders: Partial<Record<Prop['kind'], string>> = {
  text: quote('Label'),
  number: '1',
  boolean: 'false',
};

const firstOption = (prop: Prop): string | undefined => {
  const first = prop.options?.[0];

  return first === undefined ? undefined : quote(first);
};

const argValue = (prop: Prop): string | undefined =>
  prop.kind === 'choice' ? firstOption(prop) : placeholders[prop.kind];

// Required props take a placeholder, so every story type-checks; the rest stay args for Controls.
function metaArgs(props: Prop[]): string {
  const lines = props
    .filter((prop) => prop.required)
    .flatMap((prop): string[] => {
      const value = argValue(prop);

      return value === undefined ? [] : [`${prop.name}: ${value},`];
    });

  return lines.length === 0 ? '' : `  args: { ${lines.join(' ')} },\n`;
}

const literal = (value: string | boolean): string =>
  typeof value === 'boolean' ? String(value) : quote(value);

const storySource = (entry: StoryEntry): string => {
  const args = Object.entries(entry.args)
    .map(([key, value]) => `${key}: ${literal(value)}`)
    .join(', ');

  return `export const ${entry.name}: Story = { args: { ${args} } };\n`;
};

const controls: Record<Prop['kind'], string> = {
  text: "{ control: 'text' }",
  number: "{ control: 'number' }",
  boolean: "{ control: 'boolean' }",
  choice: "{ control: 'select' }",
  opaque: '{ control: false }',
};

function control(prop: Prop): string {
  if (prop.kind !== 'choice') return controls[prop.kind];

  const options = (prop.options ?? []).map(quote).join(', ');

  return `{ control: 'select', options: [${options}] }`;
}

function argTypesSource(plan: StoryPlan): string {
  if (plan.kitPart !== undefined)
    return `  argTypes: kitArgTypes(${quote(plan.kitPart)}),\n`;

  const lines = plan.props.map((prop) => `    ${prop.name}: ${control(prop)},`);

  return lines.length === 0 ? '' : `  argTypes: {\n${lines.join('\n')}\n  },\n`;
}

const kitImport = (plan: StoryPlan): string =>
  plan.kitPart === undefined
    ? ''
    : "import { kitArgTypes } from '#lib/generic/kit-arg-types';\n";

const metaSource = (plan: StoryPlan): string =>
  [
    'const meta = {\n',
    `  title: ${quote(plan.title)},\n`,
    `  component: ${plan.component},\n`,
    metaArgs(plan.props),
    argTypesSource(plan),
    `} satisfies Meta<typeof ${plan.component}>;\n\n`,
  ].join('');

// A branch-less component gets one `Default` story, so the file always has a state to show.
export function renderStory(plan: StoryPlan): string {
  const declared = new Set(plan.props.map((prop) => prop.name));

  const stories = storyEntries(
    plan.branches,
    declared.size === 0 ? undefined : declared,
  );

  const body =
    stories.length === 0
      ? ['export const Default: Story = {};\n']
      : stories.map(storySource);

  return [
    "import type { Meta, StoryObj } from '@storybook/react-native-web-vite';\n",
    kitImport(plan),
    `import { ${plan.component} } from ${quote(plan.importPath)};\n\n`,
    metaSource(plan),
    'export default meta;\n\n',
    'type Story = StoryObj<typeof meta>;\n\n',
    body.join('\n'),
  ].join('');
}
