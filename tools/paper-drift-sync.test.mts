import { expect, it } from 'vitest';
import {
  chipCopy,
  chipMaster,
  chipRegistry,
  componentBoard,
  screen,
  snapshotOf,
} from './paper-drift.mocks.mts';
import { planSync } from './paper-drift/sync-plan.mts';

it('plans to keep text, hiding, placement and switched nested masters', (): void => {
  const copy = chipCopy('a', {
    root: { gap: '6px', width: '200px' },
    label: { display: 'none' },
    dot: 'Dot / Off',
  });
  const snapshot = snapshotOf([componentBoard(chipMaster()), screen(copy)]);
  expect(planSync(snapshot, chipRegistry, 'Chip')).toEqual({
    plans: [
      {
        masterId: 'chip',
        copyId: 'a',
        copyPath: 'Screen › Chip',
        parentId: 'screen',
        fixes: 1,
        placement: { width: '200px' },
        texts: [['label', 'a-label']],
        display: [['label', 'none']],
        kept: [['dot', 'a-dot']],
      },
    ],
    blocked: [],
  });
});

it('skips copies already in sync and blocks copies whose layers differ', (): void => {
  const missing = {
    id: 'b',
    name: 'Chip',
    children: [{ id: 'b-dot', name: 'Dot / On' }],
  };
  const snapshot = snapshotOf([
    componentBoard(chipMaster()),
    screen(chipCopy('a'), missing),
  ]);
  const found = planSync(snapshot, chipRegistry, 'Chip');
  expect(found.plans).toEqual([]);
  expect(found.blocked.map((blocked): string => blocked.copyId)).toEqual(['b']);
});

it('refuses an unregistered master', (): void => {
  const snapshot = snapshotOf([componentBoard(chipMaster())]);
  expect((): unknown => planSync(snapshot, chipRegistry, 'Nope')).toThrow(
    '"Nope" is not a registered master.',
  );
});
