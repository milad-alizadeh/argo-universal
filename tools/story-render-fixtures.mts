import {
  readStory,
  storySuffix,
  type NamedImport,
  type StoryExport,
  type StoryFile,
} from './story-file.mts';
import { pascal } from './story-title-path.mts';

export type FixturePair = {
  file: string;
  first: string;
  second: string;
  fixture: string;
};

const fixtureModule = /(?:-fixtures|\.mocks)(?:\.[a-z]+)?$|\/mocks\//;

const stemOf = (specifier: string): string =>
  (specifier.slice(specifier.lastIndexOf('/') + 1).split('.')[0] ?? '').replace(
    '-fixtures',
    '',
  );

const componentOf = (specifier: string): string => pascal(stemOf(specifier));

type Subject = { component: string; stem: string };

const subjectOf = (story: StoryFile, component: string): Subject => ({
  component,
  stem: stemOf(story.file.replace(storySuffix, '')),
});

const ownFixture = (specifier: string, subject: Subject): boolean =>
  componentOf(specifier) === subject.component ||
  stemOf(specifier) === subject.stem;

/* A fixture file of the component the story file documents holds that component's own states (ADR-0040 decision 10). */
const childFixture = (specifier: string, subject: Subject): boolean =>
  fixtureModule.test(specifier) && !ownFixture(specifier, subject);

/* A fixture is plain props named as its story is; a PascalCase import is a component a story renders. */
const isFixtureName = (name: string): boolean =>
  name !== '' && name[0] === name[0]?.toLowerCase();

const addNames = (
  names: Map<string, string>,
  { names: imported, from }: NamedImport,
): void => {
  for (const name of imported) if (isFixtureName(name)) names.set(name, from);
};

const importedNames = (
  imports: readonly NamedImport[],
  subject: Subject,
): Map<string, string> => {
  const names = new Map<string, string>();

  for (const clause of imports)
    if (childFixture(clause.from, subject)) addNames(names, clause);

  return names;
};

const blockEnd = (
  headers: readonly StoryExport[],
  index: number,
  end: number,
): number => headers[index + 1]?.start ?? end;

const storyBlocks = (
  source: string,
  headers: readonly StoryExport[],
): [string, string][] =>
  headers.map((header, index): [string, string] => [
    header.name,
    source.slice(header.headerEnd, blockEnd(headers, index, source.length)),
  ]);

const members = (block: string, name: string): string[] =>
  [...block.matchAll(new RegExp(`\\b${name}\\.(\\w+)`, 'g'))].map(
    (match): string => match[1] ?? '',
  );

const referenced = (
  block: string,
  names: ReadonlyMap<string, string>,
): Map<string, string[]> => {
  const used = new Map<string, string[]>();

  for (const [name] of names)
    if (new RegExp(`\\b${name}\\b`).test(block))
      used.set(name, members(block, name));

  return used;
};

type Referenced = ReadonlyMap<string, string[]>;

const memberList = (used: Referenced, name: string): string[] =>
  used.get(name) ?? [];

const picksAnother = (
  left: Referenced,
  right: Referenced,
  name: string,
): boolean =>
  memberList(left, name).length > 0 &&
  memberList(right, name).length > 0 &&
  memberList(left, name).join() !== memberList(right, name).join();

/* Two stories reading two members of one imported fixture object are enumerating a child's states. */
const enumeratedMembers = (
  left: Referenced,
  right: Referenced,
): string | undefined =>
  [...left.keys()].find((name): boolean => picksAnother(left, right, name));

const bothSides = (
  ours: readonly string[],
  theirs: readonly string[],
): boolean =>
  ours.length > 0 &&
  theirs.length > 0 &&
  !ours.some((name): boolean => theirs.includes(name));

/* Two stories reading two exports of one child's fixtures module are the ADR's own spelling of the same thing. */
const separateFixtures = (
  left: Referenced,
  right: Referenced,
): string | undefined => {
  const ours = [...left.keys()];
  const theirs = [...right.keys()];

  return bothSides(ours, theirs) ? `${ours[0]} and ${theirs[0]}` : undefined;
};

const combinations = <T,>(items: readonly T[]): [T, T][] =>
  items.flatMap((item, index): [T, T][] =>
    items.slice(index + 1).map((other): [T, T] => [item, other]),
  );

type StoryReferences = [string, Referenced];

const pairOf = (
  file: string,
  left: StoryReferences,
  right: StoryReferences,
): FixturePair[] => {
  const fixture =
    enumeratedMembers(left[1], right[1]) ?? separateFixtures(left[1], right[1]);

  return fixture === undefined
    ? []
    : [{ file, first: left[0], second: right[0], fixture }];
};

/* The pairs worth rendering twice; rendering every pair in a file would cost a browser run of its own. */
export const fixturePairs = (story: StoryFile): FixturePair[] => {
  const read = readStory(story);
  const subject = subjectOf(story, read.component ?? '');
  const names = importedNames(read.imports, subject);

  const stories = storyBlocks(story.source, read.exports).map(
    ([name, block]): StoryReferences => [name, referenced(block, names)],
  );

  return combinations(stories).flatMap((pair): FixturePair[] =>
    pairOf(story.file, pair[0], pair[1]),
  );
};
