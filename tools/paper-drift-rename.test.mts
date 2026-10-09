import { expect, it } from 'vitest';
import {
  chipCopy,
  chipMaster,
  chipRegistry,
  componentBoard,
  screen,
  snapshotOf,
} from './paper-drift.mocks.mts';
import { masterLevels } from './paper-drift/master-levels.mts';
import { planRename } from './paper-drift/rename-plan.mts';

const NEW_NAME = 'Chip / Default';
const snapshot = snapshotOf([
  componentBoard(chipMaster()),
  screen(chipCopy('a'), { id: 'other', name: 'StatusChip' }),
]);

function renameChipTo(to: string): ReturnType<typeof planRename> {
  return planRename(snapshot, chipRegistry, {
    renames: [{ id: 'chip', from: 'Chip', to }],
    aliases: [],
  });
}

it('renames a master, its copies and its registry entry together', (): void => {
  const plan = renameChipTo(NEW_NAME);
  expect(plan.updates).toEqual([
    { nodeId: 'chip', name: NEW_NAME },
    { nodeId: 'a', name: NEW_NAME },
  ]);
  expect(plan.registry.masters[0]?.name).toBe(NEW_NAME);
  expect(plan.problems).toEqual([]);
});

it('carries a renamed base into its variations', (): void => {
  const plan = planRename(snapshot, chipRegistry, {
    renames: [{ id: 'dot', from: 'Dot / On', to: 'StatusDot / On' }],
    aliases: [{ from: 'Dot / Off', to: 'StatusDot / Off' }],
  });
  expect(plan.registry.masters[2]).toMatchObject({
    name: 'StatusDot / On',
    variantOf: 'StatusDot / Off',
  });
});

it('refuses a new name another layer already uses', (): void => {
  expect(renameChipTo('StatusChip').problems).toEqual([
    '"StatusChip" is already used by a layer that is not renamed',
  ]);
});

it('orders a nested master before the master that holds it', (): void => {
  expect(masterLevels(snapshot, chipRegistry)).toEqual([
    { depth: 0, names: ['Dot / Off', 'Dot / On'] },
    { depth: 1, names: ['Chip'] },
  ]);
});
