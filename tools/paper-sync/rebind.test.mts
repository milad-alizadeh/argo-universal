import { expect, it } from 'vitest';
import { enroll } from './bind.mts';
import { pair } from './fixtures.mts';
import type { Binding } from './model.mts';
import { rebind, rebindCandidates, structure } from './rebind.mts';

type MovedCopy = { prior: Binding; next: Binding };

function movedCopy(): MovedCopy {
  const { master, copy } = pair();

  const prior = {
    ...enroll(master, copy),
    structure: structure(copy),
    location: {
      fileId: 'destination',
      page: 'Session',
      board: 'Desktop',
      flow: 'Flow / Send',
    },
  };

  const next = {
    ...prior,
    fileId: 'moved',
    nodeId: 'new',
    nodes: { button: 'new', label: 'new-label' },
  };

  return { prior, next };
}

it('rebinds a moved copy while retaining overrides', () => {
  const { prior, next } = movedCopy();
  expect(rebind(prior, [next])).toMatchObject({
    nodeId: 'new',
    textOverrides: { Label: 'Publish' },
  });
});

it('rejects a candidate with different structure', () => {
  const { prior, next } = movedCopy();
  expect(
    rebindCandidates(prior, [{ ...next, structure: 'different' }]),
  ).toEqual([]);
});

it('rejects a candidate in a different flow', () => {
  const { prior, next } = movedCopy();

  const location = {
    fileId: 'moved',
    page: 'Session',
    board: 'Desktop',
    flow: 'Flow / Other',
  };

  expect(rebindCandidates(prior, [{ ...next, location }])).toEqual([]);
});

it('rejects ambiguous rebinding candidates', () => {
  const { prior, next } = movedCopy();
  expect(() => rebind(prior, [next, { ...next, nodeId: 'another' }])).toThrow(
    'found 2',
  );
});
