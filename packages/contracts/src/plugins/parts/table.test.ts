import { expect, it } from 'vitest';
import { prepareWireTree } from '../prepare-tree';
import { runTableRoot } from '../table-wire-fixtures';
import type { WireNode } from '../wire';

const updateMessage = 'Update Argo to see this';

it('keeps a Table of rows, cells, Pills and row Actions', () => {
  expect(prepareWireTree(runTableRoot)).toEqual(runTableRoot);
});

const controlInACell: WireNode = {
  type: 'Table.Cell',
  key: 'cell',
  props: { column: 'name', text: 'Deploy' },
  children: [
    {
      type: 'Button',
      key: 'deploy',
      props: { label: 'Deploy' },
      children: [],
      slots: {},
    },
  ],
  slots: {},
};

const columnWithoutAnId: WireNode = {
  ...runTableRoot,
  props: { columns: [{ title: 'Workflow' }] },
  children: [],
};

it.each([
  ['a control drawn in a cell', controlInACell],
  ['a column without an id', columnWithoutAnId],
])('refuses %s', (_name, tree) => {
  expect(prepareWireTree(tree)).toMatchObject({
    type: 'Text',
    props: { children: updateMessage },
  });
});
