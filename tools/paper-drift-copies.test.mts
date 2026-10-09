import { expect, it } from 'vitest';
import {
  chipCopy,
  chipMaster,
  chipRegistry,
  componentBoard,
  screen,
  snapshotOf,
} from './paper-drift.mocks.mts';
import { findCopyDrift } from './paper-drift/copy-drift.mts';
import { pairLayers } from './paper-drift/layer-pairing.mts';
import { pairingRules } from './paper-drift/registry.mts';
import { layerAt } from './paper-drift/snapshot-model.mts';

function driftOf(
  ...copies: ReturnType<typeof chipCopy>[]
): ReturnType<typeof findCopyDrift> {
  return findCopyDrift(
    snapshotOf([componentBoard(chipMaster()), screen(...copies)]),
    chipRegistry,
  );
}

it('finds nothing in a copy that only changes text and placement', (): void => {
  expect(
    driftOf(chipCopy('a', { root: { width: '200px', display: 'none' } })),
  ).toEqual([]);
});

it('reports a style a copy changed inside the master', (): void => {
  const [found] = driftOf(chipCopy('a', { label: { fontSize: '13px' } }));
  expect(found?.drift).toEqual([
    {
      path: '1',
      layer: 'Label',
      changes: [{ property: 'fontSize', master: '14px', copy: '13px' }],
    },
  ]);
});

it('allows a nested master to switch to another state of its family', (): void => {
  expect(driftOf(chipCopy('a', { dot: 'Dot / Off' }))).toEqual([]);
});

it('reports a nested layer renamed outside its family', (): void => {
  const [found] = driftOf(chipCopy('a', { dot: 'Spinner' }));
  expect(found?.drift[0]?.problem).toBe(
    'is named "Spinner"; the master has "Dot / On"',
  );
});

it('keeps nested masters out of the walk and records them', (): void => {
  const snapshot = snapshotOf([
    componentBoard(chipMaster()),
    screen(chipCopy('a')),
  ]);
  const roots = {
    master: layerAt(snapshot, 'chip'),
    copy: layerAt(snapshot, 'a'),
  };
  const pairing = pairLayers(snapshot, roots, pairingRules(chipRegistry));
  expect(pairing.kept.map((pair): string => pair.copy.id)).toEqual(['a-dot']);
  expect(pairing.pairs.map((pair): string => pair.path)).toEqual(['', '1']);
});

it('reports a copy with a different number of children', (): void => {
  const copy = {
    id: 'a',
    name: 'Chip',
    children: [{ id: 'a-dot', name: 'Dot / On' }],
  };
  const [found] = driftOf(copy);
  expect(found?.drift[0]?.problem).toBe(
    'has 1 children (Dot / On); the master has 2 (Dot / On, Label)',
  );
});

it('leaves out copies on an ignored artboard', (): void => {
  const snapshot = snapshotOf([
    componentBoard(chipMaster()),
    screen(chipCopy('a', { label: { fontSize: '13px' } })),
  ]);
  const registry = { ...chipRegistry, ignoredArtboards: ['Screen'] };
  expect(findCopyDrift(snapshot, registry)).toEqual([]);
});
