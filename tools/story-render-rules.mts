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

export { fixturePairs, type FixturePair } from './story-render-fixtures.mts';

const emptyNode: RenderNode = {
  tag: '',
  attributes: '',
  text: '',
  children: [],
};

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

export const nodeCount = (tree: RenderNode): number =>
  1 +
  tree.children.reduce((total, child): number => total + nodeCount(child), 0);
