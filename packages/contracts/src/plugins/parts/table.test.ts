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

it('refuses a Table for an App that predates it', () => {
  const older = Object.fromEntries(
    Object.entries(currentPartVersions).filter(([type]) => type !== 'Table'),
  );

  expect(prepareWireTree(runTableRoot, older)).toMatchObject({
    type: 'Text',
    props: { children: updateMessage },
  });
});

it('refuses a control drawn in a cell', () => {
  const cell: WireNode = {
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

  expect(prepareWireTree(cell, currentPartVersions)).toMatchObject({
    type: 'Text',
    props: { children: updateMessage },
  });
});

it('refuses a column without an id', () => {
  const table: WireNode = {
    ...runTableRoot,
    props: { columns: [{ title: 'Workflow' }] },
    children: [],
  };

  expect(prepareWireTree(table, currentPartVersions)).toMatchObject({
    type: 'Text',
    props: { children: updateMessage },
  });
});
