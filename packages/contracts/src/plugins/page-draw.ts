import { z } from 'zod';
import { PageAddress } from './page-address';
import type { WireNode } from './wire';
import { sameIdentity, sameJson, sameTree, treeHash } from './wire-identity';

// The most pages of a paged list one address shows.
export const maxPages = 50;

/*
 * One draw the App asks for: the address, how many pages of its paged list it shows, and the hash of the tree it
 * keeps for the address, so an answer that would match it is `unchanged`. `pages` and `known` are not part of the
 * address: two Apps showing one address keep their own page counts.
 */
export const DrawRequest = PageAddress.extend({
  pages: z.number().int().positive().max(maxPages).optional(),
  known: z.string().min(1).optional(),
});

export type DrawRequest = z.infer<typeof DrawRequest>;

/*
 * How a drawn tree crosses to the App (ADR-0050). `tree` is the whole Plugin tree; `unchanged` says the tree the
 * App keeps is the one drawn; `append` says that tree with `rows` appended to the children of the node `at` walks
 * to, which now has `props`. Each names the hash of the whole tree it leaves the App holding.
 */
export type TreeAnswer =
  | { kind: 'tree'; root: WireNode; hash: string }
  | { kind: 'unchanged'; hash: string }
  | { kind: 'append'; append: Appended; hash: string };

// A draw's answer: how its tree crosses, and how many pages its paged list shows; or why it failed.
export type DrawAnswer =
  | (TreeAnswer & { pages: number })
  | { kind: 'failed'; error: string };

// A step from a node to one of its children, or to a node in one of its slots.
export type AppendStep = { slot?: string; index: number };

export type Appended = {
  at: AppendStep[];
  props: WireNode['props'];
  rows: WireNode[];
};

// A tree and the hash it is known by.
export type HashedTree = { root: WireNode; hash: string };

/*
 * The answer for a drawn tree, from the tree this side last sent for the address and the hash of the tree the
 * App keeps. Unchanged when the hashes match; only the new rows when the App keeps the tree last sent and the
 * drawn one only grows it at one node, as a load more grows its List; anything else is the whole tree.
 */
export function treeAnswer(
  drawn: WireNode,
  sent: WireNode | undefined,
  known: string | undefined,
): TreeAnswer {
  const hash = treeHash(drawn);

  if (known === hash) return { kind: 'unchanged', hash };

  const append = appendTo(sent, known, drawn);

  return append
    ? { kind: 'append', append, hash }
    : { kind: 'tree', root: drawn, hash };
}

// The rows to append, when the App keeps the tree last sent.
const appendTo = (
  sent: WireNode | undefined,
  known: string | undefined,
  drawn: WireNode,
): Appended | null =>
  sent && known === treeHash(sent) ? grownAt(sent, drawn, []) : null;

/*
 * The tree an answer leaves the App holding, from the one it keeps, or undefined when the answer builds on a tree
 * it does not keep. An unchanged answer gives back the very tree kept, and an append keeps every node off its path.
 */
export function treeAfter(
  kept: HashedTree | undefined,
  answer: TreeAnswer,
): HashedTree | undefined {
  if (answer.kind === 'tree') return { root: answer.root, hash: answer.hash };

  return kept && builtOn(kept, answer);
}

type Grown = Exclude<TreeAnswer, { kind: 'tree' }>;

function builtOn(kept: HashedTree, answer: Grown): HashedTree | undefined {
  if (answer.kind === 'append')
    return { root: appendedAt(kept.root, answer.append), hash: answer.hash };

  return kept.hash === answer.hash ? kept : undefined;
}

/*
 * The one node `after` grows by rows appended to its children, everything else equal but that node's props, or
 * null. A sub-row that nests under an earlier row, or any other change, is not an append.
 */
function grownAt(
  before: WireNode,
  after: WireNode,
  at: AppendStep[],
): Appended | null {
  if (!sameIdentity(before, after)) return null;

  return grows(before, after)
    ? {
        at,
        props: after.props,
        rows: after.children.slice(before.children.length),
      }
    : grownWithin(before, after, at);
}

// The node's own props are the same, and the one child or slot node that changed grows.
function grownWithin(
  before: WireNode,
  after: WireNode,
  at: AppendStep[],
): Appended | null {
  const pair = sameJson(before.props, after.props)
    ? onlyChanged(before, after)
    : undefined;

  return pair ? grownAt(pair.before, pair.after, [...at, pair.step]) : null;
}

// The node keeps its slots and its children, and has more children after them.
const grows = (before: WireNode, after: WireNode): boolean =>
  after.children.length > before.children.length &&
  sameJson(slotHashes(before), slotHashes(after)) &&
  before.children.every((child, index) =>
    sameTree(child, after.children[index] ?? child),
  );

const slotHashes = (node: WireNode): [string, string[]][] =>
  Object.entries(node.slots).map(([slot, nodes]) => [
    slot,
    nodes.map(treeHash),
  ]);

type Pair = { step: AppendStep; before: WireNode; after: WireNode };

type Lists = [string | undefined, WireNode[], WireNode[]][];

// The one child or slot node that differs, when the nodes' shapes match and exactly one does.
function onlyChanged(before: WireNode, after: WireNode): Pair | undefined {
  const changed = (listsOf(before, after) ?? []).flatMap(changedIn);

  return changed.length === 1 ? changed[0] : undefined;
}

const changedIn = ([slot, one, other]: Lists[number]): Pair[] =>
  one.flatMap((node, index): Pair[] => {
    const next = other[index] ?? node;

    return sameTree(node, next)
      ? []
      : [{ step: stepTo(slot, index), before: node, after: next }];
  });

const stepTo = (slot: string | undefined, index: number): AppendStep =>
  slot === undefined ? { index } : { slot, index };

function listsOf(before: WireNode, after: WireNode): Lists | null {
  const slots = Object.keys(after.slots);

  if (!sameJson(Object.keys(before.slots), slots)) return null;

  const lists: Lists = [
    [undefined, before.children, after.children],
    ...slots.map((slot): Lists[number] => [
      slot,
      before.slots[slot] ?? [],
      after.slots[slot] ?? [],
    ]),
  ];

  return lists.every(([, one, other]) => one.length === other.length)
    ? lists
    : null;
}

// The tree with the rows appended where `at` leads; every node off that path keeps its identity.
function appendedAt(node: WireNode, appended: Appended): WireNode {
  const [step, ...rest] = appended.at;

  if (!step)
    return {
      ...node,
      props: appended.props,
      children: [...node.children, ...appended.rows],
    };

  return appendedWithin(node, step, { ...appended, at: rest });
}

function appendedWithin(
  node: WireNode,
  step: AppendStep,
  inner: Appended,
): WireNode {
  const replaced = (nodes: WireNode[]): WireNode[] =>
    nodes.map((child, index) =>
      index === step.index ? appendedAt(child, inner) : child,
    );

  if (step.slot === undefined)
    return { ...node, children: replaced(node.children) };

  const slot = replaced(node.slots[step.slot] ?? []);

  return { ...node, slots: { ...node.slots, [step.slot]: slot } };
}
