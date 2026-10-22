/*
 * The gates of ADR-0040: what a story file must declare, and what a story may be called.
 * Titles are `story-title-rules.mts`; this module reads the body of a story file.
 */

import { posix } from 'node:path';

export type Sources = ReadonlyMap<string, string>;

type ArgsBlock = { owner: string; body: string };

type Lookup = { file: string; source: string; sources: Sources };

type Component = { name: string; lookup: Lookup };

const presentationStory = /\.stories\.tsx$/;

const testStory = /\.test\.stories\.tsx$/;

const checkedPackage = /^packages\/(?:kit|client)\/src\//;

const metaOpens = 'const meta = {';

const metaCloses = '\n};';

// Horizontal space only: `\s` spans newlines under `m`, which costs backtracking for no gain.
const declaresComponent = /^[ \t]*component:[ \t]*(\w+)/m;

const declaresArgTypes = /^[ \t]*argTypes:/m;

const optsOutOfDocs = /'!autodocs'/;

const storyExport = /^export const (\w+)(?=\s*[:=])/gm;

// A story named for the prop that drives it, rather than for what the component then looks like.
const namedForAProp = /^(?:With|Without)[A-Z]|(?:True|False)$/;

const blockComment = /\/\*[\s\S]*?\*\//g;

const lineComment = /\/\/[^\n]*/g;

const singleQuoted = /'(?:\\.|[^'\\])*'/g;

const doubleQuoted = /"(?:\\.|[^"\\])*"/g;

const backQuoted = /`(?:\\.|[^`\\])*`/g;

const innermostGroup = /[{[(][^{}[\]()]*[}\])]/g;

/*
 * Every quantifier here is bounded and none spans a newline: an unbounded run of space before a
 * colon or a brace is what makes a key pattern backtrack across a whole file. The formatter leaves
 * a key, its colon and its opening brace together, so one optional space is all a match needs.
 */
const keyToken = /\b([A-Za-z_$][\w$]*)\??:/g;

const argsOpens = /\bargs: ?\{/g;

const objectArg = /\b([A-Za-z_$][\w$]*): ?\{/g;

const namedImport =
  /import[ \t]+(?:type[ \t]+)?\{([^}]*)\}[ \t\n]*from[ \t]*['"]([^'"]+)['"]/g;

const anyStoryExport = /export const (\w+)/g;

// What a flattened spy or arrow entry is left looking like: `onSend: fn`, `onClose: =>`.
const callbackEntry = /\b[A-Za-z_$][\w$]*\??: {0,3}(?:fn|action|=>)/g;

const declaresRender = /^[ \t]*render:/m;

// A props type the gate cannot read whole: an extension, an intersection, a union or a generic.
const unreadableHead = /extends|[&|<]/;

const moduleExtensions = ['.tsx', '.ts', '/index.tsx', '/index.ts'];

const flattenRounds = 40;

/*
 * Three keys is where an object stops being a bundle of scalars a prop needs anyway — a size, a
 * pair of coordinates, a one-field wrapper — and starts being a state someone named. ADR-0040
 * decision 10 wants every such state exported once from `<component>-fixtures.ts`, so a parent and
 * its child cannot drift; below three keys there is no state worth a name.
 */
const fixtureKeyCount = 3;

const isChecked = (file: string): boolean =>
  checkedPackage.test(file) &&
  presentationStory.test(file) &&
  !testStory.test(file);

const startOf = (match: RegExpMatchArray): number => match.index ?? 0;

const group = (match: RegExpMatchArray, index: number): string =>
  match[index] ?? '';

// Sliced rather than matched: a meta holds nested braces, which a regex pays for in backtracking.
const metaOf = (source: string): string => {
  const opens = source.indexOf(metaOpens);

  if (opens < 0) return '';

  const closes = source.indexOf(metaCloses, opens);

  return closes < 0 ? source.slice(opens) : source.slice(opens, closes);
};

const storyNames = (source: string): string[] =>
  [...source.matchAll(storyExport)].map((match): string => group(match, 1));

const documentsAComponent = (meta: string): boolean =>
  declaresComponent.test(meta) &&
  !declaresArgTypes.test(meta) &&
  !optsOutOfDocs.test(meta);

// A file that documents a component states its prop domain, which is what an author writes against.
const argTypesProblems = (file: string, source: string): string[] =>
  documentsAComponent(metaOf(source))
    ? [
        `${file}: meta sets \`component:\` but no \`argTypes\`. Add \`argTypes: kitArgTypes('<Component>')\`, or the component's own prop domain, so Controls and the autodocs props table have a schema to read. To opt out instead, add \`tags: ['!autodocs']\` with a comment saying why.`,
      ]
    : [];

// ADR-0040 decision 4: a story is named for the situation it shows, never for the prop that caused it.
const storyNameProblems = (file: string, source: string): string[] =>
  storyNames(source)
    .filter((name): boolean => namedForAProp.test(name))
    .map(
      (name): string =>
        `${file}: story \`${name}\` is named after a prop, not a state. Name it for what the component looks like (\`Destructive\`, \`Compact\`, \`Loading\`), or make the prop an arg with a Control and delete the story.`,
    );

/*
 * Comments and string bodies are emptied before any brace is counted, so a brace inside a quoted
 * label or a commented-out draft cannot move the gate's idea of where an object ends.
 */
const bare = (source: string): string =>
  source
    .replace(blockComment, '\n')
    .replace(lineComment, '\n')
    .replace(singleQuoted, "''")
    .replace(doubleQuoted, '""')
    .replace(backQuoted, '``');

/*
 * Innermost groups are emptied round by round until none is left, so what remains is the top level
 * alone. Each group goes without a trace, which keeps `onPress(): void` readable as a key.
 */
const flattened = (body: string): string => {
  let text = body;

  for (let round = 0; round < flattenRounds; round += 1) {
    const next = text.replace(innermostGroup, '');

    if (next === text) return text;

    text = next;
  }

  return text;
};

const keysIn = (flat: string): string[] =>
  [...flat.matchAll(keyToken)].map((match): string => group(match, 1));

const topLevelKeys = (body: string): string[] => keysIn(flattened(body));

/*
 * The keys that carry data. ADR-0040 decision 10 keeps a fixture plain data and leaves callback
 * spies in the story file, so an object made only of spies is already where the ADR wants it.
 */
const dataKeys = (body: string): string[] =>
  keysIn(flattened(body).replace(callbackEntry, ''));

const blockStep = (char: string): number =>
  (char === '{' ? 1 : 0) - (char === '}' ? 1 : 0);

// The body between `opens`, which holds a `{`, and its matching `}`.
const blockFrom = (text: string, opens: number): string => {
  let depth = 0;

  for (let cursor = opens; cursor < text.length; cursor += 1) {
    depth += blockStep(text.charAt(cursor));

    if (depth === 0) return text.slice(opens + 1, cursor);
  }

  return text.slice(opens + 1);
};

const blockAfter = (text: string, match: RegExpMatchArray): string =>
  blockFrom(text, startOf(match) + match[0].length - 1);

// The story an args block belongs to, or the meta, whose args reach every story in the file.
const ownerAt = (text: string, cursor: number): string =>
  [...text.slice(0, cursor).matchAll(anyStoryExport)].at(-1)?.[1] ?? 'meta';

const argsBlocks = (text: string): ArgsBlock[] =>
  [...text.matchAll(argsOpens)].map((match): ArgsBlock => ({
    owner: ownerAt(text, startOf(match)),
    body: blockAfter(text, match),
  }));

const importedFrom = (source: string, name: string): string | undefined => {
  const word = new RegExp(`\\b${name}\\b`);

  return [...source.matchAll(namedImport)].find((match): boolean =>
    word.test(group(match, 1)),
  )?.[2];
};

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

const componentIn = (source: string): string | undefined =>
  declaresComponent.exec(metaOf(source))?.[1];

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
  const name = componentIn(story.source);

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
const undeclaredArgProblems = (story: Lookup): string[] => {
  const known = new Set(declaredPropNames(story));

  if (known.size === 0 || declaresRender.test(metaOf(story.source))) return [];

  const blocks = argsBlocks(bare(story.source));

  return [
    ...new Set(
      blocks.flatMap((block): string[] =>
        undeclaredIn(story.file, block, known),
      ),
    ),
  ];
};

const inlineProblem = (file: string, block: ArgsBlock, key: string): string =>
  `${file}: story \`${block.owner}\` spells out \`${key}\` inline. Export that state from \`<child>-fixtures.ts\` beside the child, one export per story, and import it here, so the parent and the child keep one definition of the state.`;

/*
 * Only the outermost object of an args entry is read: a nested one moves with it when the entry
 * becomes an import, so naming them all would send an author after the same fix three times.
 */
const outermostObjects = (body: string): RegExpMatchArray[] => {
  const found: RegExpMatchArray[] = [];
  let consumed = 0;

  for (const match of body.matchAll(objectArg)) {
    if (startOf(match) < consumed) continue;

    found.push(match);
    consumed =
      startOf(match) + match[0].length + blockAfter(body, match).length;
  }

  return found;
};

const inlineIn = (file: string, block: ArgsBlock): string[] =>
  outermostObjects(block.body).flatMap((match): string[] =>
    dataKeys(blockAfter(block.body, match)).length < fixtureKeyCount
      ? []
      : [inlineProblem(file, block, group(match, 1))],
  );

/*
 * ADR-0040 decision 5: a child's state arrives as the child's own exported fixture, so the two
 * cannot drift. Callbacks stay inline, which they do here for free: a spy is not an object literal.
 */
const inlineFixtureProblems = (file: string, source: string): string[] =>
  argsBlocks(bare(source)).flatMap((block): string[] => inlineIn(file, block));

export const gateProblems = (
  file: string,
  source: string,
  sources: Sources = new Map(),
): string[] =>
  isChecked(file)
    ? [
        ...argTypesProblems(file, source),
        ...storyNameProblems(file, source),
        ...undeclaredArgProblems({ file, source, sources }),
        ...inlineFixtureProblems(file, source),
      ]
    : [];
