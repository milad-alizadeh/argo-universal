export type FixturePair = {
  file: string;
  first: string;
  second: string;
  fixture: string;
};

export type StoryFile = { file: string; source: string };

const storyHeader = /^export const (\w+)\s*:/gm;

const importClause = /^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gm;

const identifier = /[\w$]+/g;

const fixtureModule = /(?:-fixtures|\.mocks)(?:\.[a-z]+)?$|\/mocks\//;

const metaComponent = /\bcomponent:\s*(\w+)/;

const kebabPart = /-(\w)/g;

const groupNumber = (match: readonly string[] | null, group: number): string =>
  match?.[group] ?? '';

const matchStart = (match: RegExpMatchArray): number => match.index ?? 0;

const pascal = (stem: string): string =>
  (stem.charAt(0).toUpperCase() + stem.slice(1)).replaceAll(
    kebabPart,
    (_match, letter: string): string => letter.toUpperCase(),
  );

const stemOf = (specifier: string): string =>
  (specifier.slice(specifier.lastIndexOf('/') + 1).split('.')[0] ?? '').replace(
    '-fixtures',
    '',
  );

const componentOf = (specifier: string): string => pascal(stemOf(specifier));

type Subject = { component: string; stem: string };

const subjectOf = ({ file, source }: StoryFile): Subject => ({
  component: groupNumber(metaComponent.exec(source), 1),
  stem: stemOf(file.replace('.stories.tsx', '')),
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
  clause: RegExpMatchArray,
): void => {
  for (const name of groupNumber(clause, 1).matchAll(identifier))
    if (isFixtureName(groupNumber(name, 0)))
      names.set(groupNumber(name, 0), groupNumber(clause, 2));
};

const importedNames = (story: StoryFile): Map<string, string> => {
  const subject = subjectOf(story);
  const names = new Map<string, string>();

  for (const clause of story.source.matchAll(importClause))
    if (childFixture(groupNumber(clause, 2), subject)) addNames(names, clause);

  return names;
};

const blockEnd = (
  headers: readonly RegExpMatchArray[],
  index: number,
  end: number,
): number => {
  const next = headers[index + 1];

  return next === undefined ? end : matchStart(next);
};

const storyBlocks = (source: string): [string, string][] => {
  const headers = [...source.matchAll(storyHeader)];

  return headers.map((header, index): [string, string] => [
    groupNumber(header, 1),
    source.slice(
      matchStart(header) + groupNumber(header, 0).length,
      blockEnd(headers, index, source.length),
    ),
  ]);
};

const members = (block: string, name: string): string[] =>
  [...block.matchAll(new RegExp(`\\b${name}\\.(\\w+)`, 'g'))].map(
    (match): string => groupNumber(match, 1),
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
  const names = importedNames(story);

  const stories = storyBlocks(story.source).map(
    ([name, block]): StoryReferences => [name, referenced(block, names)],
  );

  return combinations(stories).flatMap((pair): FixturePair[] =>
    pairOf(story.file, pair[0], pair[1]),
  );
};
