/*
 * The render gates of ADR-0040: two presentation stories that draw the same thing (decision 4),
 * and a parent story that only varies a child's own box (decisions 5 and 7). Everything here is
 * pure, so the runner owns the browser and this module owns the reading of what came back.
 */

export type RenderNode = {
  tag: string;
  attributes: string;
  text: string;
  children: RenderNode[];
};

export type StoryRender = {
  file: string;
  story: string;
  domHash: string;
  pixelHash: string;
};

export type ChildStatePair = {
  file: string;
  first: string;
  second: string;
  fixture: string;
  maskedDomHashesMatch: boolean;
  maskedPixelHashesMatch: boolean;
  maskDepth: number;
  maskedNodes: number;
  totalNodes: number;
};

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

const emptyNode: RenderNode = {
  tag: '',
  attributes: '',
  text: '',
  children: [],
};

const groupNumber = (match: readonly string[] | null, group: number): string =>
  match?.[group] ?? '';

const matchStart = (match: RegExpMatchArray): number => match.index ?? 0;

const childAt = (node: RenderNode, index: number): RenderNode =>
  node.children[index] ?? emptyNode;

const sameStructure = (left: RenderNode, right: RenderNode): boolean =>
  left.tag === right.tag && left.children.length === right.children.length;

const sameContent = (left: RenderNode, right: RenderNode): boolean =>
  left.attributes === right.attributes && left.text === right.text;

const sameNode = (left: RenderNode, right: RenderNode): boolean =>
  sameStructure(left, right) && sameContent(left, right);

const differingChildren = (left: RenderNode, right: RenderNode): number[] =>
  left.children.flatMap((_child, index): number[] =>
    maskPath(childAt(left, index), childAt(right, index)) === undefined
      ? []
      : [index],
  );

const deeper = (
  left: RenderNode,
  right: RenderNode,
  index: number,
): number[] => [
  index,
  ...(maskPath(childAt(left, index), childAt(right, index)) ?? []),
];

const onlyDiffering = (differing: readonly number[]): number | undefined =>
  differing.length === 1 ? differing[0] : undefined;

const descend = (
  left: RenderNode,
  right: RenderNode,
  differing: readonly number[],
): number[] | undefined => {
  const index = onlyDiffering(differing);

  if (index !== undefined) return deeper(left, right, index);

  return differing.length === 0 ? undefined : [];
};

/*
 * The one box the two renders differ inside: their lowest common ancestor of difference.
 * `[]` means no single child owns the change; `undefined` means the two renders match.
 */
export const maskPath = (
  left: RenderNode,
  right: RenderNode,
): number[] | undefined =>
  sameNode(left, right)
    ? descend(left, right, differingChildren(left, right))
    : [];

const byFile = <T extends { file: string }>(
  rows: readonly T[],
): Map<string, T[]> => {
  const files = new Map<string, T[]>();

  for (const row of rows)
    files.set(row.file, [...(files.get(row.file) ?? []), row]);

  return files;
};

const sameRender = (left: StoryRender, right: StoryRender): boolean =>
  left.domHash === right.domHash && left.pixelHash === right.pixelHash;

const duplicateProblem = (render: StoryRender, twin: StoryRender): string =>
  `${render.file}: ${render.story} draws what ${twin.story} already draws. A story is one state the component can be in (ADR-0040 decision 4), so delete one of the two or give this one a state that differs on screen.`;

const duplicatesIn = (renders: readonly StoryRender[]): string[] =>
  renders.flatMap((render, index): string[] => {
    const twin = renders
      .slice(0, index)
      .find((earlier): boolean => sameRender(earlier, render));

    return twin === undefined ? [] : [duplicateProblem(render, twin)];
  });

/* Gate 3: the same rendered DOM and the same pixels inside one file is one state written twice. */
export const duplicateRenderProblems = (
  renders: readonly StoryRender[],
): string[] =>
  [...byFile(renders).values()].flatMap((inFile): string[] =>
    duplicatesIn(inFile),
  );

/*
 * Hiding most of the page leaves nothing of the parent's own to compare, so a box this large is
 * the story's whole subject rather than one child of a composition.
 */
const MAX_MASKED_SHARE = 0.5;

const smallEnough = (pair: ChildStatePair): boolean =>
  pair.totalNodes > 0 && pair.maskedNodes / pair.totalNodes < MAX_MASKED_SHARE;

const maskedOneBox = (pair: ChildStatePair): boolean =>
  pair.maskDepth > 0 && smallEnough(pair);

const caughtByGate = (pair: ChildStatePair): boolean =>
  maskedOneBox(pair) &&
  pair.maskedDomHashesMatch &&
  pair.maskedPixelHashesMatch;

const childStateProblem = (pair: ChildStatePair): string =>
  `${pair.file}: ${pair.first} and ${pair.second} pick two states of ${pair.fixture} and draw the same page outside that child's own box. A parent earns a story for a child's state only when the state changes the parent's own composition (ADR-0040 decision 5), so move the states to the child's own story file and keep one story here.`;

/* Gate 5: with the one differing box hidden, the parent drew the same page twice. */
export const childStateProblems = (
  pairs: readonly ChildStatePair[],
): string[] =>
  pairs.flatMap((pair): string[] =>
    caughtByGate(pair) ? [childStateProblem(pair)] : [],
  );

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

export const nodeCount = (tree: RenderNode): number =>
  1 +
  tree.children.reduce((total, child): number => total + nodeCount(child), 0);
