/*
 * Drawing a story, and drawing a candidate pair again with the one box they differ inside hidden.
 * Only this module and `story-render-fingerprint.ts` touch the browser.
 */
import {
  maskPath,
  nodeCount,
  type RenderNode,
} from '../../tools/story-render-rules.mts';
import {
  elementChildren,
  hashOf,
  pixelHash,
  serialize,
  settle,
} from './story-render-fingerprint.ts';

export type ComposedStory = {
  run: (context: { canvasElement: HTMLElement }) => Promise<void>;
};

export type StoryModule = Record<string, ComposedStory>;

export type DrawnStory = {
  tree: RenderNode;
  domHash: string;
  pixelHash: string;
};

export type PairMeasurement = {
  maskDepth: number;
  maskedDomHashesMatch: boolean;
  maskedPixelHashesMatch: boolean;
  maskedNodes: number;
  totalNodes: number;
};

export type PairSubject = { story: ComposedStory; tree: RenderNode };

const canvas = document.createElement('div');

document.body.append(canvas);

/* One canvas for every story, so Storybook's own re-render unmounts the last story and its portals. */
const draw = async (story: ComposedStory): Promise<void> => {
  await story.run({ canvasElement: canvas });
  await settle();
};

const descendTo = (from: Element, index: number): Element | undefined =>
  elementChildren(from)[index];

const nodeAt = (path: readonly number[]): HTMLElement | undefined => {
  const found = path.reduce<Element | undefined>(
    (element, index): Element | undefined =>
      element === undefined ? undefined : descendTo(element, index),
    document.body,
  );

  return found instanceof HTMLElement ? found : undefined;
};

const maskedTree = (tree: RenderNode, path: readonly number[]): RenderNode =>
  path.length === 0
    ? { tag: tree.tag, attributes: '', text: '', children: [] }
    : {
        ...tree,
        children: tree.children.map((child, index): RenderNode =>
          index === path[0] ? maskedTree(child, path.slice(1)) : child,
        ),
      };

const hide = (path: readonly number[]): void => {
  const hidden = nodeAt(path);

  if (hidden !== undefined) hidden.style.visibility = 'hidden';
};

const drawMasked = async (
  subject: PairSubject,
  path: readonly number[],
): Promise<{ domHash: string; pixelHash: string }> => {
  await draw(subject.story);
  hide(path);
  await settle();

  return {
    domHash: await hashOf(JSON.stringify(maskedTree(subject.tree, path))),
    pixelHash: await pixelHash(),
  };
};

/*
 * Every story the plan names, a story with a `play` included: `run` plays it before this module
 * reads the DOM, so the fingerprint is of what the story ends up drawing. Skipping those stories
 * instead would let a `play` take one out of the gate's reach.
 */
export const presentationStories = (module: StoryModule): string[] =>
  Object.keys(module);

export const drawStory = async (story: ComposedStory): Promise<DrawnStory> => {
  await draw(story);
  const tree = serialize(document.body);

  return {
    tree,
    domHash: await hashOf(JSON.stringify(tree)),
    pixelHash: await pixelHash(),
  };
};

const measured = async (
  left: PairSubject,
  right: PairSubject,
  path: readonly number[],
): Promise<PairMeasurement> => {
  const first = await drawMasked(left, path);
  const second = await drawMasked(right, path);

  return {
    maskDepth: path.length,
    maskedDomHashesMatch: first.domHash === second.domHash,
    maskedPixelHashesMatch: first.pixelHash === second.pixelHash,
    maskedNodes: nodeCount(nodeOfTree(left.tree, path)),
    totalNodes: nodeCount(left.tree),
  };
};

const nodeOfTree = (tree: RenderNode, path: readonly number[]): RenderNode =>
  path.reduce<RenderNode>(
    (node, index): RenderNode => node.children[index] ?? node,
    tree,
  );

const unmeasured: PairMeasurement = {
  maskDepth: 0,
  maskedDomHashesMatch: false,
  maskedPixelHashesMatch: false,
  maskedNodes: 0,
  totalNodes: 0,
};

/* Nothing to measure when the two renders match everywhere or differ in more than one box. */
export const measurePair = async (
  left: PairSubject,
  right: PairSubject,
): Promise<PairMeasurement> => {
  const path = maskPath(left.tree, right.tree) ?? [];

  return path.length === 0 ? unmeasured : measured(left, right, path);
};
