import { expect, it } from 'vitest';
import { pinKey, pinKeyOf } from './draft-pin-key';

const place = { region: 'list', variant: 'rows', label: 'List', letter: 'A' };

it('keeps a note made on one Variant off the same node on another', () => {
  const noted = pinKeyOf({
    address: 'page/list/row',
    nodeKey: 'row',
    region: 'list',
    variant: 'rows',
    note: 'Chip',
  });

  expect(pinKey('page/list/row', place)).toBe(noted);
  expect(pinKey('page/list/row', { ...place, variant: 'cards' })).not.toBe(
    noted,
  );
});

it('tells a node outside every region from one inside', () => {
  expect(pinKey('page/title', null)).not.toBe(pinKey('page/title', place));
  expect(
    pinKeyOf({ address: 'page/title', nodeKey: 'title', note: 'Big' }),
  ).toBe(pinKey('page/title', null));
});
