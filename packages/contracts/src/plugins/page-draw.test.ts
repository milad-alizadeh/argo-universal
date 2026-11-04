import { describe, expect, it } from 'vitest';
import {
  DrawRequest,
  treeAfter,
  treeAnswer,
  type HashedTree,
  type TreeAnswer,
} from './page-draw';
import type { WireNode } from './wire';
import { treeHash } from './wire-identity';

// A small seeded generator, so every run draws the same trees and a failure names its seed.
function random(seed: number): (below: number) => number {
  let state = seed;

  return (below) => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;

    return state % below;
  };
}

type Pick = (below: number) => number;

const types = ['ListDetail', 'Screen', 'List', 'ListItem', 'Text'];

function tree(pick: Pick, depth: number, key: string): WireNode {
  const children = Array.from({ length: depth > 0 ? pick(4) : 0 }, (_, n) =>
    tree(pick, depth - 1, `${n}`),
  );

  return {
    type: types[pick(types.length)] ?? 'Text',
    key,
    props: { title: `t${pick(3)}` },
    children,
    slots: slotsOf(pick, depth),
  };
}

// Now and then a node has a mark in its leading slot.
const slotsOf = (pick: Pick, depth: number): WireNode['slots'] =>
  depth > 0 && pick(3) === 0 ? { leading: [tree(pick, 0, 'mark')] } : {};

// The same tree with rows appended to the node a seeded walk ends at, and that node's props changed.
function grown(pick: Pick, node: WireNode): WireNode {
  const into = node.children.length > 0 && pick(2) === 0;

  if (into) {
    const index = pick(node.children.length);

    const children = node.children.map((child, at) =>
      at === index ? grown(pick, child) : child,
    );

    return { ...node, children };
  }

  const rows = Array.from({ length: 1 + pick(3) }, (_, n) =>
    tree(pick, 1, `new-${n}`),
  );

  return {
    ...node,
    props: { ...node.props, more: pick(2) === 0 },
    children: [...node.children, ...rows],
  };
}

// The same tree with one prop changed somewhere off a growing List.
function edited(pick: Pick, node: WireNode): WireNode {
  const index = pick(node.children.length + 1);
  const child = node.children[index];

  if (!child) return { ...node, props: { ...node.props, title: 'edited' } };

  return {
    ...node,
    children: node.children.with(index, edited(pick, child)),
  };
}

type Crossed = { answer: TreeAnswer; kept: HashedTree | undefined };

// The App keeps `before`, the Server last sent it and draws `after`; the answer and what the App ends with.
function crossed(before: WireNode, after: WireNode): Crossed {
  const answer = treeAnswer(after, before, treeHash(before));

  return {
    answer,
    kept: treeAfter({ root: before, hash: treeHash(before) }, answer),
  };
}

const seeds = Array.from({ length: 200 }, (_, n) => n + 1);

describe('a tree crossing to the App', () => {
  it.each(seeds)(
    'gives back the drawn tree from any kept tree (seed %i)',
    (seed) => {
      const pick = random(seed);
      const before = tree(pick, 3, 'root');

      const afters = [
        before,
        structuredClone(before),
        grown(pick, before),
        edited(pick, before),
        tree(pick, 3, 'root'),
      ];

      for (const after of afters)
        expect(crossed(before, after).kept).toEqual({
          root: after,
          hash: treeHash(after),
        });
    },
  );

  it('sends only the rows a load more appended, and a whole tree for anything else', () => {
    const pick = random(7);
    const before = tree(pick, 3, 'root');

    expect(crossed(before, structuredClone(before)).answer.kind).toBe(
      'unchanged',
    );
    expect(crossed(before, grown(pick, before)).answer.kind).toBe('append');
    expect(crossed(before, edited(pick, before)).answer.kind).toBe('tree');
  });

  it('keeps the very tree for an unchanged answer, and every node off an append path', () => {
    const list: WireNode = {
      type: 'List',
      key: 'issues',
      props: {},
      children: [],
      slots: {},
    };

    const sidebar = { ...list, key: 'sidebar' };
    const before = { ...list, key: 'root', children: [sidebar, list] };

    const after = {
      ...before,
      children: [sidebar, { ...list, children: [{ ...list, key: 'row' }] }],
    };

    expect(crossed(before, structuredClone(before)).kept?.root).toBe(before);
    expect(crossed(before, after).kept?.root.children[0]).toBe(sidebar);
  });

  it('sends the whole tree when the App keeps a tree other than the one last sent', () => {
    const pick = random(3);
    const before = tree(pick, 3, 'root');
    const answer = treeAnswer(grown(pick, before), before, 'another');

    expect(answer.kind).toBe('tree');
    expect(treeAfter(undefined, answer)?.root).toBe(
      answer.kind === 'tree' ? answer.root : undefined,
    );
  });

  it('builds on nothing when the App keeps no tree, or another one', () => {
    const before = tree(random(5), 2, 'root');
    const { answer } = crossed(before, structuredClone(before));
    const other = { root: before, hash: 'another' };

    expect(treeAfter(undefined, answer)).toBeUndefined();
    expect(treeAfter(other, answer)).toBeUndefined();
  });
});

describe('DrawRequest', () => {
  const request = (path: string): unknown => ({
    pluginId: 'counter',
    path,
    pageState: {},
    pages: 1,
  });

  it('refuses a Page path longer than an App may ask for', () => {
    expect(DrawRequest.safeParse(request('/page')).success).toBe(true);
    expect(DrawRequest.safeParse(request(`/${'a'.repeat(600)}`)).success).toBe(
      false,
    );
  });
});
