import { createHash } from 'node:crypto';
import type {
  Appended,
  AppendStep,
  DrawAnswer,
  Drawn,
} from '@repo/contracts/plugins/page-draw';
import type { WireNode } from '@repo/contracts/plugins/wire';

// How many recent trees the Server keeps by hash, so a load more can answer only its new rows.
const keptTrees = 64;

/*
 * How a drawn tree goes back to the App (ADR-0050). The App names the hash of the tree it keeps for the address:
 * the same hash is `unchanged`; a tree this Server sent recently that the new one only grows at one node, as a
 * load more grows its List, is `append` with the new rows; anything else is the whole `tree`. Every answer names
 * the new tree's hash, so the App's next ask can be `unchanged`. A Server that restarted has kept no trees and
 * answers whole ones.
 */
export class TreeAnswers {
  private readonly sent = new Map<string, WireNode>();

  public answer(root: WireNode, pages: number, known?: string): DrawAnswer {
    const hash = treeHash(root);
    const before = this.sent.get(known ?? '');

    this.keep(hash, root);

    if (known === hash) return { kind: 'unchanged', hash, pages };

    return grownAnswer(before, root, { hash, pages });
  }

  private keep(hash: string, root: WireNode): void {
    this.sent.delete(hash);
    this.sent.set(hash, root);

    for (const oldest of this.sent.keys()) {
      if (this.sent.size <= keptTrees) break;
      this.sent.delete(oldest);
    }
  }
}

function grownAnswer(
  before: WireNode | undefined,
  root: WireNode,
  drawn: Drawn,
): DrawAnswer {
  const append = before && appendOf(before, root);

  return append
    ? { kind: 'append', append, ...drawn }
    : { kind: 'tree', root, ...drawn };
}

export const treeHash = (root: WireNode): string =>
  createHash('sha256').update(JSON.stringify(root)).digest('base64url');

const same = <Value>(one: Value, other: Value): boolean =>
  JSON.stringify(one) === JSON.stringify(other);

/*
 * The one node `after` grows by rows appended to its children, everything else equal but that node's props, or
 * null. A sub-row that nests under an earlier row, or any other change, is not an append.
 */
export function appendOf(before: WireNode, after: WireNode): Appended | null {
  return grownAt(before, after, []);
}

function grownAt(
  before: WireNode,
  after: WireNode,
  at: AppendStep[],
): Appended | null {
  if (!sameNode(before, after)) return null;

  return grows(before, after)
    ? {
        at,
        props: after.props,
        rows: after.children.slice(before.children.length),
      }
    : changedWithin(before, after, at);
}

const sameNode = (before: WireNode, after: WireNode): boolean =>
  before.type === after.type && before.key === after.key;

// The node keeps its slots and its children, and has more children after them.
const grows = (before: WireNode, after: WireNode): boolean =>
  after.children.length > before.children.length &&
  same(before.slots, after.slots) &&
  same(before.children, after.children.slice(0, before.children.length));

// The node's own props are the same, and the one child or slot node that changed grows.
const changedWithin = (
  before: WireNode,
  after: WireNode,
  at: AppendStep[],
): Appended | null =>
  same(before.props, after.props) ? onlyChange(before, after, at) : null;

type Pair = { step: AppendStep; before: WireNode; after: WireNode };

function onlyChange(
  before: WireNode,
  after: WireNode,
  at: AppendStep[],
): Appended | null {
  const pair = onlyOne(changedPairs(before, after));

  return pair ? grownAt(pair.before, pair.after, [...at, pair.step]) : null;
}

const onlyOne = <Item>(items: Item[]): Item | undefined =>
  items.length === 1 ? items[0] : undefined;

const changedPairs = (before: WireNode, after: WireNode): Pair[] =>
  (pairsOf(before, after) ?? []).filter(
    (pair) => !same(pair.before, pair.after),
  );

type Lists = [string | undefined, WireNode[], WireNode[]][];

// The nodes' children and slot nodes side by side, or null when their shapes differ.
function pairsOf(before: WireNode, after: WireNode): Pair[] | null {
  const lists = listsOf(before, after);

  if (!lists) return null;

  return lists.flatMap(([slot, one, other]) =>
    one.map((node, index) => ({
      step: slot === undefined ? { index } : { slot, index },
      before: node,
      after: other[index] ?? node,
    })),
  );
}

function listsOf(before: WireNode, after: WireNode): Lists | null {
  const slots = Object.keys(after.slots);

  if (!same(Object.keys(before.slots), slots)) return null;

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
