import type { WireNode } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { appendOf, TreeAnswers } from './tree-answers';

type Parts = Partial<Pick<WireNode, 'props' | 'children' | 'slots'>>;

const node = (type: string, key: string, parts: Parts): WireNode => ({
  type,
  key,
  props: {},
  children: [],
  slots: {},
  ...parts,
});

const row = (n: number, children: WireNode[] = []): WireNode =>
  node('ListItem', String(n), { props: { title: `Issue ${n}` }, children });

// A page with a sidebar and a List of rows, its pagination saying whether more are left.
const page = (rows: WireNode[], hasMore: boolean): WireNode =>
  node('ListDetail', 'root', {
    slots: {
      list: [node('List', 'sidebar', { children: [row(1000)] })],
      detail: [
        node('Screen', 'screen', {
          props: { title: 'Open' },
          children: [
            node('List', 'issues', {
              props: { pagination: { hasMore } },
              children: rows,
            }),
          ],
        }),
      ],
    },
  });

it('answers only the rows a load more appended, and where they go', () => {
  const before = page([row(1), row(2)], true);
  const after = page([row(1), row(2), row(3)], false);

  expect(appendOf(before, after)).toEqual({
    at: [{ slot: 'detail', index: 0 }, { index: 0 }],
    props: { pagination: { hasMore: false } },
    rows: [row(3)],
  });
});

it('sends the whole tree when a new row nests under an earlier one', () => {
  const before = page([row(1), row(2)], true);
  const after = page([row(1), row(2, [row(3)])], false);

  expect(appendOf(before, after)).toBeNull();
});

it('sends the whole tree when anything besides the growing List changed', () => {
  const before = page([row(1)], true);
  const after = page([row(1), row(2)], true);

  after.slots.list = [node('List', 'sidebar', { children: [row(1001)] })];

  expect(appendOf(before, after)).toBeNull();
});

it('answers unchanged for the tree the App keeps, and append against a tree it sent', () => {
  const answers = new TreeAnswers();
  const first = answers.answer(page([row(1)], true), 1);

  if (first.kind !== 'tree') throw new Error('first draw is a whole tree');

  expect(answers.answer(page([row(1)], true), 1, first.hash)).toEqual({
    kind: 'unchanged',
    hash: first.hash,
    pages: 1,
  });

  const more = answers.answer(page([row(1), row(2)], false), 2, first.hash);

  expect(more).toMatchObject({ kind: 'append', pages: 2 });
});

it('sends the whole tree for a hash it never sent', () => {
  const answers = new TreeAnswers();

  expect(answers.answer(page([row(1)], true), 1, 'unknown').kind).toBe('tree');
});
