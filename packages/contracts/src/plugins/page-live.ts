import { z } from 'zod';
import { PageAddress } from './page-address';
import { treeAfter, type HashedTree, type TreeAnswer } from './page-draw';
import type { PatchOp, WireNode } from './wire';
import { treeHash } from './wire-identity';
import { applyPatch, diff } from './wire-patch';

// A live page the App subscribes to while it is on screen, and the hash of the tree it keeps for the address.
export const LiveRequest = PageAddress.extend({
  known: z.string().min(1).optional(),
});

export type LiveRequest = z.infer<typeof LiveRequest>;

// ADR-0031's keyed ops onto the tree hashed `base`, which leave the tree hashed `hash`.
export type LivePatch = {
  kind: 'patch';
  base: string;
  ops: PatchOp[];
  hash: string;
};

// A live answer that carries a tree.
export type LiveTree = Exclude<TreeAnswer, { kind: 'append' }> | LivePatch;

/*
 * One answer on a live page's subscription (ADR-0050). The first is the whole `tree`, or `unchanged` when it
 * is the tree the App keeps; each after it is a `patch` from the one before. `failed` says why the Loader or
 * its tree failed, and ends the subscription.
 */
export type LiveAnswer = LiveTree | { kind: 'failed'; error: string };

// The first answer on a subscription: the whole tree, or unchanged when it is the one the App keeps.
const firstAnswer = (
  root: WireNode,
  hash: string,
  known: string | undefined,
): LiveTree =>
  known === hash ? { kind: 'unchanged', hash } : { kind: 'tree', root, hash };

/*
 * The answer for a live page's next tree, from the tree this side last sent on the subscription, or none for
 * its first; null when the tree is the one sent, so nothing crosses.
 */
export function liveAnswer(
  drawn: WireNode,
  sent?: HashedTree,
  known?: string,
): LiveTree | null {
  const hash = treeHash(drawn);

  if (!sent) return firstAnswer(drawn, hash, known);

  return sent.hash === hash
    ? null
    : { kind: 'patch', base: sent.hash, ops: diff(sent.root, drawn), hash };
}

// The tree a patch leaves, or undefined when its keys leave the tree.
function patched(kept: HashedTree, answer: LivePatch): HashedTree | undefined {
  try {
    return { root: applyPatch(kept.root, answer.ops), hash: answer.hash };
  } catch {
    return undefined;
  }
}

/*
 * The tree a live answer leaves the App holding, from the one it keeps, or undefined when the answer builds on
 * a tree it does not keep: a patch onto another hash, or one whose keys leave the tree. A patch keeps every
 * node it does not touch.
 */
export function liveTreeAfter(
  kept: HashedTree | undefined,
  answer: LiveTree,
): HashedTree | undefined {
  return answer.kind === 'patch'
    ? patchedOnto(kept, answer)
    : treeAfter(kept, answer);
}

const patchedOnto = (
  kept: HashedTree | undefined,
  answer: LivePatch,
): HashedTree | undefined =>
  kept?.hash === answer.base ? patched(kept, answer) : undefined;
