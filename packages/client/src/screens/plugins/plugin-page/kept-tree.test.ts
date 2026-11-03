import type { WireNode } from '@repo/contracts/plugins/wire';
import { describe, expect, it } from 'vitest';
import { appendedAt, keptAfter, type Answer } from './kept-tree';

type Parts = Partial<Pick<WireNode, 'props' | 'children' | 'slots'>>;

const node = (key: string, parts: Parts = {}): WireNode => ({
  type: 'Node',
  key,
  props: {},
  children: [],
  slots: {},
  ...parts,
});

// A sidebar beside a List of rows, as a filter page draws.
const root = node('root', {
  slots: {
    list: [node('sidebar', { children: [node('filter')] })],
    detail: [
      node('screen', {
        children: [
          node('issues', { props: { more: true }, children: [node('1')] }),
        ],
      }),
    ],
  },
});

// The node a path of child indexes leads to, from the first node in a slot.
const nodeAt = (
  tree: WireNode,
  slot: string,
  path: number[],
): WireNode | undefined =>
  path.reduce<WireNode | undefined>(
    (at, index) => at?.children[index],
    tree.slots[slot]?.[0],
  );

const kept: Extract<Answer, { ok: true }> = {
  ok: true,
  root,
  hash: 'one',
  pages: 1,
};

describe('a draw answer', () => {
  it('keeps the very same tree for an unchanged answer', () => {
    expect(keptAfter(kept, { kind: 'unchanged', hash: 'one', pages: 1 })).toBe(
      kept,
    );
  });

  it('appends the new rows where the answer says, keeping every other node', () => {
    const after = keptAfter(kept, {
      kind: 'append',
      hash: 'two',
      pages: 2,
      append: {
        at: [{ slot: 'detail', index: 0 }, { index: 0 }],
        props: { more: false },
        rows: [node('2')],
      },
    });

    if (!after.ok) throw new Error(after.error);

    expect(nodeAt(after.root, 'detail', [0])).toMatchObject({
      props: { more: false },
      children: [{ key: '1' }, { key: '2' }],
    });
    expect(nodeAt(after.root, 'list', [])).toBe(nodeAt(root, 'list', []));
    expect(nodeAt(after.root, 'detail', [0, 0])).toBe(
      nodeAt(root, 'detail', [0, 0]),
    );
    expect(after).toMatchObject({ hash: 'two', pages: 2 });
  });

  it('takes a whole tree as it comes, and says why a draw failed', () => {
    expect(
      keptAfter(kept, { kind: 'tree', root: node('new'), hash: 'h', pages: 3 }),
    ).toEqual({ ok: true, root: node('new'), hash: 'h', pages: 3 });
    expect(keptAfter(kept, { kind: 'failed', error: 'gh refused' })).toEqual({
      ok: false,
      error: 'gh refused',
    });
  });

  it('refuses an append to a tree the App no longer keeps', () => {
    expect(
      keptAfter(undefined, { kind: 'unchanged', hash: 'one', pages: 1 }).ok,
    ).toBe(false);
  });
});

it('appends at the root when the path is empty', () => {
  expect(
    appendedAt(node('list', { children: [node('a')] }), {
      at: [],
      props: {},
      rows: [node('b')],
    }).children.map(({ key }) => key),
  ).toEqual(['a', 'b']);
});
