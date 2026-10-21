/*
 * One shape for a story (ADR-0040): a prop value earns a story when the component branches on it,
 * every other prop is an arg, and no combination is invented.
 */
import { type Branch, TRUE } from './story-branches.mts';
import type { PropDomain } from './story-props.mts';

export interface StoryPlan {
  readonly name: string;
  readonly prop: string;
  readonly literal: string;
}

export interface ArgSeed {
  readonly name: string;
  readonly literal: string;
}

export interface DraftInput {
  readonly title: string;
  readonly component: string;
  readonly kitPart: string | undefined;
  readonly props: readonly PropDomain[];
  readonly branches: readonly Branch[];
}

export interface StoryDraft {
  readonly title: string;
  readonly component: string;
  readonly kitPart: string | undefined;
  readonly args: readonly ArgSeed[];
  readonly controls: readonly PropDomain[];
  readonly stories: readonly StoryPlan[];
  readonly unseeded: readonly string[];
}

const pascal = (name: string): string =>
  name
    .split(/[-_]/)
    .map((part): string => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const covers = (prop: PropDomain, value: string): boolean =>
  prop.values.includes(value) || (value === TRUE && prop.acceptsBoolean);

const earns = (prop: PropDomain | undefined, value: string): boolean =>
  prop !== undefined && covers(prop, value);

const earned = (
  props: readonly PropDomain[],
  branches: readonly Branch[],
): Branch[] =>
  branches.filter((branch): boolean =>
    earns(
      props.find((prop): boolean => prop.name === branch.prop),
      branch.value,
    ),
  );

// A boolean's only branch is the prop being true, so the prop name is the state name; otherwise the value names it.
const storyName = (branch: Branch): string =>
  branch.value === TRUE ? pascal(branch.prop) : pascal(branch.value);

const literalOf = (branch: Branch): string =>
  branch.value === TRUE ? TRUE : `'${branch.value}'`;

const unique = (names: string[], name: string, prop: string): string =>
  names.includes(name) ? `${name}${pascal(prop)}` : name;

function plans(branches: readonly Branch[]): StoryPlan[] {
  const taken: string[] = [];

  return branches.map((branch): StoryPlan => {
    const name = unique(taken, storyName(branch), branch.prop);

    taken.push(name);

    return { name, prop: branch.prop, literal: literalOf(branch) };
  });
}

const PLACEHOLDERS = new Map([
  ['boolean', TRUE],
  ['number', '1'],
]);

const firstValue = (prop: PropDomain): string => prop.values[0] ?? '';

// A required prop with no branch still needs a value, and a kit primitive's copy is placeholder text, never product copy.
const placeholder = (prop: PropDomain): string | undefined => {
  if (prop.kind === 'text') return `'${pascal(prop.name)}'`;

  if (prop.kind === 'choice') return `'${firstValue(prop)}'`;

  return PLACEHOLDERS.get(prop.kind);
};

const seeds = (props: readonly PropDomain[]): ArgSeed[] =>
  props.flatMap((prop): ArgSeed[] => {
    const literal = placeholder(prop);

    return literal === undefined ? [] : [{ name: prop.name, literal }];
  });

const branchless = (
  props: readonly PropDomain[],
  branches: readonly Branch[],
): PropDomain[] =>
  props.filter(
    (prop): boolean =>
      prop.required &&
      !branches.some((branch): boolean => branch.prop === prop.name),
  );

const named = (props: readonly PropDomain[]): string[] =>
  props.map((prop): string => prop.name);

const seeded = (args: readonly ArgSeed[]): string[] =>
  args.map((arg): string => arg.name);

export function storyDraft(input: DraftInput): StoryDraft {
  const branches = earned(input.props, input.branches);
  const required = branchless(input.props, branches);
  const args = seeds(required);

  return {
    title: input.title,
    component: input.component,
    kitPart: input.kitPart,
    args,
    controls: input.props.filter(
      (prop): boolean => prop.values.length > 0 || prop.acceptsBoolean,
    ),
    stories: plans(branches),
    unseeded: named(required).filter(
      (name): boolean => !seeded(args).includes(name),
    ),
  };
}
