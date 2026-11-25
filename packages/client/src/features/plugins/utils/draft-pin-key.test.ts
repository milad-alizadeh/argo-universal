import { expect, it } from 'vitest';
import { pinKey, pinKeyOf } from './draft-pin-key';

const row = 'page/list/row';

const title = 'page/title';

const place = { region: 'list', variant: 'rows', label: 'List', letter: 'A' };

it('keeps a note made on one Variant off the same node on another', () => {
  const noted = pinKeyOf({
    address: row,
    nodeKey: 'row',
    region: 'list',
    variant: 'rows',
    note: 'Chip',
  });

  expect(pinKey(row, place)).toBe(noted);
  expect(pinKey(row, { ...place, variant: 'cards' })).not.toBe(noted);
});

it('tells a node outside every region from one inside', () => {
  expect(pinKey(title, null)).not.toBe(pinKey(title, place));
  expect(pinKeyOf({ address: title, nodeKey: 'title', note: 'Big' })).toBe(
    pinKey(title, null),
  );
});
