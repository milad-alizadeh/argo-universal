import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import type { WireJson, WireNode } from './wire';

// How two Plugin trees compare, for live pages' keyed patches and for draw answers alike.

// One node stands for another when its type and key match; its props and children may still differ.
export const sameIdentity = (one: WireNode, other: WireNode): boolean =>
  one.type === other.type && one.key === other.key;

export const sameJson = (
  one: WireJson | undefined,
  other: WireJson | undefined,
): boolean => JSON.stringify(one) === JSON.stringify(other);

const hashes = new WeakMap<WireNode, string>();

const hashBytes = 16;

/*
 * The hash of a node's whole subtree, worked out once per node object from its own fields and its children's
 * hashes, so comparing two subtrees costs one string compare. A tree is never changed in place.
 */
export function treeHash(node: WireNode): string {
  const kept = hashes.get(node);

  if (kept) return kept;

  const hash = digest(JSON.stringify(hashed(node)));

  hashes.set(node, hash);

  return hash;
}

// A node's own fields, with each child and slot node standing as its hash.
const hashed = (node: WireNode): unknown[] => [
  node.type,
  node.key,
  node.props,
  node.children.map(treeHash),
  Object.entries(node.slots).map(([slot, nodes]) => [
    slot,
    nodes.map(treeHash),
  ]),
];

export const sameTree = (one: WireNode, other: WireNode): boolean =>
  one === other || treeHash(one) === treeHash(other);

const digest = (text: string): string =>
  bytesToHex(sha256(utf8ToBytes(text)).subarray(0, hashBytes));
