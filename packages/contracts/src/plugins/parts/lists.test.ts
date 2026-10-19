import { expect, it } from 'vitest';
import { prepareWireTree } from '../prepare-tree';
import type { WireNode } from '../wire';

const emptyText: WireNode = {
  type: 'Text',
  key: 'empty',
  props: { children: 'No rows' },
  children: [],
  slots: {},
};

it.each(['Text', 'Stack'])('draws %s content in a List empty Slot', (type) => {
  const content =
    type === 'Text'
      ? emptyText
      : {
          ...emptyText,
          type,
          props: { direction: 'column' },
          children: [emptyText],
        };

  const list: WireNode = {
    type: 'List',
    key: 'list',
    props: {},
    children: [],
    slots: { empty: [content] },
  };

  expect(prepareWireTree(list)).toEqual(list);
});

it('refuses a control outside the List empty Slot accepted set', () => {
  const list: WireNode = {
    type: 'List',
    key: 'list',
    props: {},
    children: [],
    slots: {
      empty: [{ ...emptyText, type: 'Button', props: { label: 'Create' } }],
    },
  };

  expect(prepareWireTree(list)).toMatchObject({
    type: 'Text',
    props: { children: 'Update Argo to see this' },
  });
});

it.each(['Switch', 'Picker', 'TextInput', 'ListItem.Toggle'])(
  'refuses %s in a row trailing Slot',
  (type) => {
    const row: WireNode = {
      type: 'ListItem',
      key: 'row',
      props: { title: 'Settings' },
      children: [],
      slots: {
        trailing: [
          { type, key: 'control', props: {}, children: [], slots: {} },
        ],
      },
    };

    expect(prepareWireTree(row)).toMatchObject({
      type: 'Text',
      props: { children: 'Update Argo to see this' },
    });
  },
);
