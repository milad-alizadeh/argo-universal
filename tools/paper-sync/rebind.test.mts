import { expect, it } from 'vitest';
import { enroll } from './bind.mts';
import { pair } from './fixtures.mts';
import { rebind, rebindCandidates, structure } from './rebind.mts';

it('rebinds a moved copy by name, structure and flow while retaining overrides', () => {
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

  expect(rebind(prior, [next])).toMatchObject({
    nodeId: 'new',
    textOverrides: { Label: 'Publish' },
  });
  expect(
    rebindCandidates(prior, [{ ...next, structure: 'different' }]),
  ).toEqual([]);
  expect(
    rebindCandidates(prior, [
      { ...next, location: { ...next.location, flow: 'Flow / Other' } },
    ]),
  ).toEqual([]);
  expect(() => rebind(prior, [next, { ...next, nodeId: 'another' }])).toThrow(
    'found 2',
  );
});
