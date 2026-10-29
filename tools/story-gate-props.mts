import { posix } from 'node:path';
import { declaresKey, group, namedImports, readStory } from './story-file.mts';
import {
  argsBlocks,
  bare,
  blockAfter,
  topLevelKeys,
  type ArgsBlock,
  type Lookup,
  type Sources,
} from './story-gate-parse.mts';

type Component = { name: string; lookup: Lookup };

// A props type the gate cannot read whole: an extension, an intersection, a union or a generic.
const unreadableHead = /extends|[&|<]/;

const moduleExtensions = ['.tsx', '.ts', '/index.tsx', '/index.ts'];

const importedFrom = (source: string, name: string): string | undefined =>
  namedImports(source).find(({ names }): boolean => names.includes(name))?.from;

const resolveModule = (
  from: string,
  specifier: string | undefined,
  sources: Sources,
): string | undefined => {
  if (specifier === undefined || !specifier.startsWith('.')) return undefined;

  const base = posix.join(posix.dirname(from), specifier);

  return moduleExtensions
    .map((extension): string => `${base}${extension}`)
    .find((path): boolean => sources.has(path));
};

const propsBody = (text: string, name: string): string | undefined => {
  const head = new RegExp(
    `\\b(?:interface|type)[ \t]+${name}\\b([^{;]*)\\{`,
  ).exec(text);

  if (head === null) return undefined;

  if (unreadableHead.test(group(head, 1))) return undefined;

  return blockAfter(text, head);
};

const localPropsKeys = (source: string, name: string): string[] | undefined => {
  const body = propsBody(bare(source), name);

  return body === undefined ? undefined : topLevelKeys(body);
};

// One hop only: a props type the component's own file takes from `<name>-props.ts` beside it.
const importedPropsKeys = (
  lookup: Lookup,
  name: string,
): string[] | undefined => {
  const module = resolveModule(
    lookup.file,
    importedFrom(lookup.source, name),
    lookup.sources,
  );

  return module === undefined
    ? undefined
    : localPropsKeys(lookup.sources.get(module) ?? '', name);
};

const propsKeys = (lookup: Lookup, name: string): string[] | undefined =>
  localPropsKeys(lookup.source, name) ?? importedPropsKeys(lookup, name);

const lookupAt = (story: Lookup, module: string): Lookup => ({
  file: module,
  source: story.sources.get(module) ?? '',
  sources: story.sources,
});

const moduleComponent = (
  story: Lookup,
  name: string,
): Component | undefined => {
  const module = resolveModule(
    story.file,
    importedFrom(story.source, name),
    story.sources,
  );

  return module === undefined
    ? undefined
    : { name, lookup: lookupAt(story, module) };
};

const componentOf = (story: Lookup): Component | undefined => {
  const name = readStory(story).component;

  return name === undefined ? undefined : moduleComponent(story, name);
};

/*
 * The props the meta's own component declares, or nothing at all where the gate cannot read them —
 * an unresolved import, a kit component's mapped type, a props type written inline. A gate that
 * guesses here cries wolf on files that are already right, which is worse than the missing check.
 */
const declaredPropNames = (story: Lookup): string[] => {
  const component = componentOf(story);

  if (component === undefined) return [];

  return propsKeys(component.lookup, `${component.name}Props`) ?? [];
};

const undeclaredIn = (
  file: string,
  block: ArgsBlock,
  known: ReadonlySet<string>,
): string[] =>
  topLevelKeys(block.body).flatMap((key): string[] =>
    known.has(key)
      ? []
      : [
          `${file}: story \`${block.owner}\` sets \`${key}\`, which is not a prop of the component this file documents. Vary only props the component declares; to put a child in another state, pass the child's exported fixture through the prop that carries it.`,
        ],
  );

// ADR-0040 decision 7: a file varies its own component's props, and never reaches into a child.
/*
 * A meta with its own `render:` is skipped: its args feed the wrapper the render draws as well as
 * the component, so the component's props are not the whole domain and a complaint here would be
 * a guess. Where there is no render, `satisfies Meta<typeof X>` and this gate agree on the domain.
 */
export const undeclaredArgProblems = (story: Lookup): string[] => {
  const known = new Set(declaredPropNames(story));

  if (known.size === 0 || declaresKey(readStory(story).meta, 'render'))
    return [];

  const blocks = argsBlocks(bare(story.source));

  return [
    ...new Set(
      blocks.flatMap((block): string[] =>
        undeclaredIn(story.file, block, known),
      ),
    ),
  ];
};
