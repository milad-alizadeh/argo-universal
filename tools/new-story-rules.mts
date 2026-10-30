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
import type { Branches } from './new-story-model.mts';
import { parseSource } from './new-story-props.mts';

export {
  storyEntries,
  type Branches,
  type StoryEntry,
  type StoryPlan,
} from './new-story-model.mts';

export { renderStory } from './new-story-render.mts';

// What `pnpm new:story` reads from a component's folder and writes as its story file (ADR-0040).

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
  const found: Node[] = [];

  traverseFast(parseSource(source), (node): void => {
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

// The kit component a props file names with `KitProps<'Name'>`, whose schema declares the props.
export const kitComponentIn = (sources: string[]): string | undefined =>
  sources
    .map((source) => /KitProps<'(\w+)'>/.exec(source)?.[1])
    .find((component) => component !== undefined);
