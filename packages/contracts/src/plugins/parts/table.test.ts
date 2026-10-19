import { expect, it } from 'vitest';
import { currentPartVersions } from '../kit';
import { prepareWireTree } from '../prepare-tree';
import { runTableRoot } from '../table-wire-fixtures';
import type { WireNode } from '../wire';

const updateMessage = 'Update Argo to see this';

it('keeps a Table of rows, cells, Pills and row ActionLists', () => {
  expect(prepareWireTree(runTableRoot, currentPartVersions)).toEqual(
    runTableRoot,
  );
});

const older = Object.fromEntries(
  Object.entries(currentPartVersions).filter(([type]) => type !== 'Table'),
);

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
  ['a Table for an App that predates it', runTableRoot, older],
  ['a control drawn in a cell', controlInACell, currentPartVersions],
  ['a column without an id', columnWithoutAnId, currentPartVersions],
])('refuses %s', (_name, tree, versions) => {
  expect(prepareWireTree(tree, versions)).toMatchObject({
    type: 'Text',
    props: { children: updateMessage },
  });
});
