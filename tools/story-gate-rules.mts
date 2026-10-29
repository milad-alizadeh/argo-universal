import {
  declaresKey,
  group,
  readStory,
  startOf,
  type StoryRead,
  storyPath,
  testStory,
} from './story-file.mts';
import {
  argsBlocks,
  bare,
  blockAfter,
  dataKeys,
  type ArgsBlock,
  type Sources,
} from './story-gate-parse.mts';
import { undeclaredArgProblems } from './story-gate-props.mts';

export type { Sources } from './story-gate-parse.mts';

const checkedPackage = /^packages\/(?:kit|client)\/src\//;

const optsOutOfDocs = /'!autodocs'/;

// A story named for the prop that drives it, rather than for what the component then looks like.
const namedForAProp = /^(?:With|Without)[A-Z]|(?:True|False)$/;

const objectArg = /\b([A-Za-z_$][\w$]*): ?\{/g;

/*
 * Three keys is where an object stops being a bundle of scalars a prop needs anyway — a size, a
 * pair of coordinates, a one-field wrapper — and starts being a state someone named. ADR-0040
 * decision 10 wants every such state exported once from `<component>-fixtures.ts`, so a parent and
 * its child cannot drift; below three keys there is no state worth a name.
 */
const fixtureKeyCount = 3;

const isChecked = (file: string): boolean =>
  checkedPackage.test(file) && storyPath.test(file) && !testStory.test(file);

const documentsAComponent = ({ meta, component }: StoryRead): boolean =>
  component !== undefined &&
  !declaresKey(meta, 'argTypes') &&
  !optsOutOfDocs.test(meta);

// A file that documents a component states its prop domain, which is what an author writes against.
const argTypesProblems = (file: string, read: StoryRead): string[] =>
  documentsAComponent(read)
    ? [
        `${file}: meta sets \`component:\` but no \`argTypes\`. Add \`argTypes: kitArgTypes('<Component>')\`, or the component's own prop domain, so Controls and the autodocs props table have a schema to read. To opt out instead, add \`tags: ['!autodocs']\` with a comment saying why.`,
      ]
    : [];

// ADR-0040 decision 4: a story is named for the situation it shows, never for the prop that caused it.
const storyNameProblems = (file: string, read: StoryRead): string[] =>
  read.exports
    .map(({ name }): string => name)
    .filter((name): boolean => namedForAProp.test(name))
    .map(
      (name): string =>
        `${file}: story \`${name}\` is named after a prop, not a state. Name it for what the component looks like (\`Destructive\`, \`Compact\`, \`Loading\`), or make the prop an arg with a Control and delete the story.`,
    );

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
): string[] => {
  if (!isChecked(file)) return [];

  const read = readStory({ file, source });

  return [
    ...argTypesProblems(file, read),
    ...storyNameProblems(file, read),
    ...undeclaredArgProblems({ file, source, sources }),
    ...inlineFixtureProblems(file, source),
  ];
};
