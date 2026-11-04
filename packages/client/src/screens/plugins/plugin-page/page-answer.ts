import {
  treeAfter,
  type DrawAnswer,
  type HashedTree,
} from '@repo/contracts/plugins/page-draw';
import type { WireNode } from '@repo/contracts/plugins/wire';

/*
 * What the App keeps for one Page address: the tree, the hash the Server gave it, and how many pages of its paged
 * list it shows; or why the last draw failed. A tree the App changed itself, as an optimistic patch does, has no
 * hash, so the next answer is a whole tree.
 */
export type Answer =
  | { ok: true; root: WireNode; hash?: string; pages: number }
  | { ok: false; error: string };

export type Kept = Extract<Answer, { ok: true }>;

export const keptOf = (answer: Answer | undefined): Kept | undefined =>
  answer?.ok ? answer : undefined;

// A page with no paged list shows none of its pages, but its draw still asks for one.
export const shownOf = (kept: Kept | undefined): number =>
  Math.max(1, kept?.pages ?? 1);

const notKept: Answer = {
  ok: false,
  error: 'The page answered for a tree the App does not keep',
};

// What the App keeps after an answer, the drawn tree rebuilt from the kept one as the Contracts say.
export function keptAfter(kept: Kept | undefined, answer: DrawAnswer): Answer {
  if (answer.kind === 'failed') return { ok: false, error: answer.error };

  const tree = treeAfter(hashedOf(kept), answer);

  return tree ? sameOrNew(kept, tree, answer.pages) : notKept;
}

const hashedOf = (kept: Kept | undefined): HashedTree | undefined =>
  kept?.hash === undefined ? undefined : { root: kept.root, hash: kept.hash };

// The very object kept, so nothing that draws it renders again, unless its tree, hash or page count moved.
const sameOrNew = (
  kept: Kept | undefined,
  tree: HashedTree,
  pages: number,
): Answer =>
  kept && unmoved(kept, tree, pages) ? kept : { ok: true, ...tree, pages };

const unmoved = (kept: Kept, tree: HashedTree, pages: number): boolean =>
  kept.root === tree.root && kept.hash === tree.hash && kept.pages === pages;
