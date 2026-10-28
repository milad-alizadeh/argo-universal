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

it('checks the move payload: the row, the section it lands in and its index there', () => {
  const event = kitComponent('List')?.events.onMove;

  expect(
    componentEventPayload(event, { id: 'login', section: 'done', index: 0 }),
  ).toEqual({ id: 'login', section: 'done', index: 0 });
  expect(componentEventPayload(event, { id: 'login', index: 2 })).toEqual({
    id: 'login',
    index: 2,
  });
  expect(() =>
    componentEventPayload(event, { id: 'login', section: 'done', index: -1 }),
  ).toThrow('Invalid Plugin event payload');
  expect(() =>
    componentEventPayload(event, { section: 'done', index: 0 }),
  ).toThrow('Invalid Plugin event payload');
});
