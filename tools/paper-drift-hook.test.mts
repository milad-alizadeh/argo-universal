import { expect, it } from 'vitest';
import {
  chipCopy,
  chipMaster,
  chipRegistry,
  componentBoard,
  screen,
  snapshotOf,
} from './paper-drift.mocks.mts';
import { editWarnings } from './paper-drift/edit-warning.mts';

const snapshot = snapshotOf([
  componentBoard(chipMaster()),
  screen(chipCopy('a'), chipCopy('b')),
]);

it('warns that an edit inside a master leaves its copies drifting', (): void => {
  const [warning] = editWarnings(snapshot, chipRegistry, {
    tool: 'update_styles',
    nodeIds: ['label'],
  });
  expect(warning).toContain('master "Chip"; its 2 copies');
});

it('warns about a style edit on a copy', (): void => {
  const [warning] = editWarnings(snapshot, chipRegistry, {
    tool: 'update_styles',
    nodeIds: ['a-label'],
  });
  expect(warning).toContain('a copy of "Chip"');
});

it('lets a copy change its text without a warning', (): void => {
  expect(
    editWarnings(snapshot, chipRegistry, {
      tool: 'set_text_content',
      nodeIds: ['a-label'],
    }),
  ).toEqual([]);
});

it('says nothing about layers outside any master', (): void => {
  expect(
    editWarnings(snapshot, chipRegistry, {
      tool: 'update_styles',
      nodeIds: ['screen', 'missing'],
    }),
  ).toEqual([]);
});
