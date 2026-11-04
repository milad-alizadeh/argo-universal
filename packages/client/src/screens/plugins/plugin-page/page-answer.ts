import {
  liveTreeAfter,
  treeAfter,
  type DrawAnswer,
  type DrawPacing,
  type HashedTree,
  type LiveTree,
} from '@repo/contracts/plugins/page-draw';
import type { WireNode } from '@repo/contracts/plugins/wire';

/*
 * What the App keeps for one Page address: the tree, the hash the Server gave it, how many pages of its paged
 * list it shows, and how it stays fresh: the interval it is drawn again on, or that it is live; or why the last
 * draw failed, keeping the interval so a failure does not stop the clock. A tree the App changed itself, as an
 * optimistic patch does, has no hash, so the next answer is a whole tree.
 */
export type Answer =
  | ({ ok: true; root: WireNode; hash?: string; pages: number } & DrawPacing)
  | { ok: false; error: string; every?: number };

export type Kept = Extract<Answer, { ok: true }>;

export const keptOf = (answer: Answer | undefined): Kept | undefined =>
  answer?.ok ? answer : undefined;

// A page with no paged list shows none of its pages, but its draw still asks for one.
export const shownOf = (kept: Kept | undefined): number =>
  Math.max(1, kept?.pages ?? 1);

const notKept = 'The page answered for a tree the App does not keep';

// Why the last draw failed, with the interval the answer before it kept.
export const failedAfter = (
  before: Answer | undefined,
  error: string,
): Answer => ({
  ok: false,
  error,
  ...(before?.every !== undefined && { every: before.every }),
});

// What the App keeps after an answer, the drawn tree rebuilt from the kept one as the Contracts say.
export function keptAfter(before: Answer | undefined, answer: DrawAnswer): Answer {
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
  before: Answer | undefined,
  answer: LiveTree,
): Answer | undefined {
  const kept = keptOf(before);
  const tree = liveTreeAfter(hashedOf(kept), answer);
  const shown = { pages: kept?.pages ?? 0, live: true as const };

  return tree && sameOrNew(kept, tree, shown);
}

const pacing = ({ every, live }: DrawPacing): DrawPacing => ({
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
): Answer =>
  kept && unmoved(kept, tree, shown) ? kept : { ok: true, ...tree, ...shown };

const unmoved = (kept: Kept, tree: HashedTree, shown: Shown): boolean =>
  kept.root === tree.root &&
  kept.hash === tree.hash &&
  kept.pages === shown.pages &&
  kept.every === shown.every &&
  kept.live === shown.live;
