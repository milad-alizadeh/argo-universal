import type { PatchOp, PatchStep, WireNode } from './wire';
import { retainedKeys } from './wire-retained-keys';

type Compare = (
  before: WireNode,
  after: WireNode,
  key: PatchStep[],
) => PatchOp[];

export interface Collection {
  parent: PatchStep[];
  slot?: string;
  compare: Compare;
}

interface Changes {
  collection: Collection;
  previous: Map<string, WireNode>;
  retained: Set<string>;
  order: string[];
  ops: PatchOp[];
}

function address({ parent, slot }: Collection, key: string): PatchStep[] {
  return [...parent, slot === undefined ? key : { slot, key }];
}

function removed(
  before: WireNode[],
  remaining: Set<string>,
  collection: Collection,
): PatchOp[] {
  return before.flatMap((node) =>
    remaining.has(node.key)
      ? []
      : [{ op: 'remove', key: address(collection, node.key) }],
  );
}

function changes(
  before: WireNode[],
  after: WireNode[],
  collection: Collection,
): Changes {
  const remaining = new Set(after.map((node) => node.key));

  return {
    collection,
    previous: new Map(before.map((node) => [node.key, node])),
    retained: retainedKeys(before, after),
    order: keptOrder(before, remaining),
    ops: removed(before, remaining, collection),
  };
}

function placement(state: Changes, node: WireNode, index: number): PatchOp {
  const { parent, slot } = state.collection;

  return state.previous.has(node.key)
    ? {
        op: 'move',
        key: address(state.collection, node.key),
        parent,
        slot,
        index,
      }
    : { op: 'insert', parent, slot, index, node };
}

function place(
  state: Changes,
  node: WireNode,
  anchor: WireNode | undefined,
): void {
  if (state.retained.has(node.key)) return;
  removeOldPosition(state.order, node.key);
  const index = anchor ? state.order.indexOf(anchor.key) : state.order.length;

  state.ops.push(placement(state, node, index));
  state.order.splice(index, 0, node.key);
}

function compare(state: Changes, node: WireNode): PatchOp[] {
  const old = state.previous.get(node.key);
  const { collection } = state;

  return old
    ? collection.compare(old, node, address(collection, node.key))
    : [];
}

// Place changed rows from the end so every destination has an already positioned next sibling.
export function diffChildren(
  before: WireNode[],
  after: WireNode[],
  collection: Collection,
): PatchOp[] {
  const state = changes(before, after, collection);

  for (const [index, node] of [...after.entries()].reverse())
    place(state, node, after[index + 1]);

  return [...state.ops, ...after.flatMap((node) => compare(state, node))];
}

function removeOldPosition(order: string[], key: string): void {
  const index = order.indexOf(key);

  if (index >= 0) order.splice(index, 1);
}

const keptOrder = (nodes: WireNode[], keys: Set<string>): string[] =>
  nodes.flatMap((node) => (keys.has(node.key) ? [node.key] : []));
