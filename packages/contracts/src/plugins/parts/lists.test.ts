import { expect, it } from 'vitest';
import { prepareWireTree } from '../prepare-tree';
import type { WireNode } from '../wire';

const updateMessage = 'Update Argo to see this';

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
    props: { children: updateMessage },
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
      props: { children: updateMessage },
    });
  },
);

it('draws composed media in a tile and refuses controls in the media Slot', () => {
  const media: WireNode = {
    type: 'Stack',
    key: 'media',
    props: { direction: 'column', gap: 2 },
    children: [emptyText],
    slots: {},
  };

  const tile: WireNode = {
    type: 'ListItem',
    key: 'tile',
    props: { title: 'Preview' },
    children: [],
    slots: { media: [media] },
  };

  expect(prepareWireTree(tile)).toEqual(tile);
  expect(
    prepareWireTree({
      ...tile,
      slots: {
        media: [{ ...emptyText, type: 'Button', props: { label: 'Edit' } }],
      },
    }),
  ).toMatchObject({ type: 'Text', props: { children: updateMessage } });
});

it('refuses a control nested inside composed media', () => {
  const row: WireNode = {
    type: 'ListItem',
    key: 'row',
    props: { title: 'Preview' },
    children: [],
    slots: {
      media: [
        {
          type: 'Stack',
          key: 'media',
          props: { direction: 'column' },
          children: [
            {
              type: 'Button',
              key: 'edit',
              props: { label: 'Edit' },
              children: [],
              slots: {},
            },
          ],
          slots: {},
        },
      ],
    },
  };

  expect(prepareWireTree(row)).toMatchObject({
    type: 'Text',
    props: { children: updateMessage },
  });
});
