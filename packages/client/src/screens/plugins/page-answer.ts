import type { DrawnTree } from '@repo/contracts/plugins/page-address';
import {
  treeAfter,
  type DrawAnswer,
  type DrawPacing,
  type HashedTree,
} from '@repo/contracts/plugins/page-draw';
import {
  liveTreeAfter,
  type LiveTree,
} from '@repo/contracts/plugins/page-live';
import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Query } from '@tanstack/react-query';

/*
 * What the App keeps for one Page address: the tree, the hash the Server gave it, how many pages of its paged
 * list it shows, and how it stays fresh: the interval it is drawn again on, or that it is live; or why the last
 * draw failed, keeping the interval so a failure does not stop the clock. A tree the App changed itself, as an
 * optimistic patch does, has no hash, so the next answer is a whole tree.
 */
export type KeptPage =
  | ({ ok: true; hash?: string } & DrawnTree<WireNode> & DrawPacing)
  | { ok: false; error: string; every?: number };

export type Kept = Extract<KeptPage, { ok: true }>;

export const keptOf = (answer: KeptPage | undefined): Kept | undefined =>
  answer?.ok ? answer : undefined;

// A page with no paged list shows none of its pages, but its draw still asks for one.
export const shownOf = (kept: Kept | undefined): number =>
  Math.max(1, kept?.pages ?? 1);

const notKept = 'The page answered for a tree the App does not keep';

// Why the last draw failed, with the interval the answer before it kept.
export const failedAfter = (
  before: KeptPage | undefined,
  error: string,
): KeptPage => ({
  ok: false,
  error,
  ...(before?.every !== undefined && { every: before.every }),
});

// What the App keeps after an answer, the drawn tree rebuilt from the kept one as the Contracts say.
export function keptAfter(
  before: KeptPage | undefined,
  answer: DrawAnswer,
): KeptPage {
  if (answer.kind === 'failed') return failedAfter(before, answer.error);

  const kept = keptOf(before);
  const tree = treeAfter(hashedOf(kept), answer);
  const { pages, every, live } = answer;
  const shown = { pages, ...pacing({ every, live }) };

  return tree ? sameOrNew(kept, tree, shown) : failedAfter(before, notKept);
}

/*
 * What the App keeps after a live page's answer, or undefined when it builds on a tree the App does not keep,
 * so the App asks for the whole tree again.
 */
export function liveAfter(
  before: KeptPage | undefined,
  answer: LiveTree,
): KeptPage | undefined {
  const kept = keptOf(before);
  const tree = liveTreeAfter(hashedOf(kept), answer);

  // A live page has no paged list.
  return tree && sameOrNew(kept, tree, { pages: 0, live: true });
}

// Whether the answer is a live page's tree, which only its subscription draws.
export const isLive = (answer: KeptPage | undefined): boolean =>
  keptOf(answer)?.live === true;

const everyOf = (answer: KeptPage | undefined): number | false =>
  answer?.every ?? false;

// The interval a kept answer is drawn again on; a live tree has none.
const intervalOf = (answer: KeptPage | undefined): number | false =>
  isLive(answer) ? false : everyOf(answer);

/*
 * A tree draws again on the interval its last answer names, and a live tree only from its subscription, so
 * neither a stale mark nor the clock draws it.
 */
export const treePacing = {
  refetchInterval: ({ state }: Query<KeptPage>): number | false =>
    intervalOf(state.data),
  enabled: ({ state }: Query<KeptPage>): boolean => !isLive(state.data),
};

// How an answer stays fresh, with no field it leaves unset.
export const pacing = ({ every, live }: DrawPacing): DrawPacing => ({
  ...(every !== undefined && { every }),
  ...(live && { live }),
});

const hashedOf = (kept: Kept | undefined): HashedTree | undefined =>
  kept?.hash === undefined ? undefined : { root: kept.root, hash: kept.hash };

type Shown = DrawPacing & { pages: number };

// The very object kept, so nothing that draws it renders again, unless its tree, hash, pages or pacing moved.
const sameOrNew = (
  kept: Kept | undefined,
  tree: HashedTree,
  shown: Shown,
): KeptPage =>
  kept && unmoved(kept, tree, shown) ? kept : { ok: true, ...tree, ...shown };

const shownKeys = ['pages', 'every', 'live'] as const;

const unmoved = (kept: Kept, tree: HashedTree, shown: Shown): boolean =>
  kept.root === tree.root &&
  kept.hash === tree.hash &&
  shownKeys.every((key): boolean => kept[key] === shown[key]);
