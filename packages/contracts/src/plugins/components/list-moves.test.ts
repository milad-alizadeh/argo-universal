import { expect, it } from 'vitest';
import { kitComponent } from '../kit';
import { boardListRoot } from '../list-wire-fixtures';
import { prepareWireTree } from '../prepare-tree';
import { componentEventPayload, type WireNode } from '../wire';

const updateMessage = 'Update Argo to see this';

it('draws a board: a List of lanes whose rows move, each lane a Section with an id', () => {
  expect(prepareWireTree(boardListRoot)).toEqual(boardListRoot);
});

it('refuses a layout the List does not declare', () => {
  const list: WireNode = { ...boardListRoot, props: { layout: 'columns' } };

  expect(prepareWireTree(list)).toMatchObject({
    type: 'Text',
    props: { children: updateMessage },
  });
});

const onMove = kitComponent('List')?.events.onMove;

it('accepts a move into a Section', () => {
  const move = { id: 'login', section: 'done', index: 0 };

  expect(componentEventPayload(onMove, move)).toEqual(move);
});

it('accepts a move to the rows outside any Section', () => {
  const move = { id: 'login', index: 2 };

  expect(componentEventPayload(onMove, move)).toEqual(move);
});

it('refuses a move to a negative index', () => {
  const move = { id: 'login', section: 'done', index: -1 };

  expect(() => componentEventPayload(onMove, move)).toThrow(
    'Invalid Plugin event payload',
  );
});

it('refuses a move without the moved row', () => {
  expect(() =>
    componentEventPayload(onMove, { section: 'done', index: 0 }),
  ).toThrow('Invalid Plugin event payload');
});
