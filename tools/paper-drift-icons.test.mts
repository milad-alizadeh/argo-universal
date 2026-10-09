import { expect, it } from 'vitest';
import { snapshotOf } from './paper-drift.mocks.mts';
import { findIconDrift, iconNamesIn } from './paper-drift/icon-drift.mts';

it('reads the keys of a symbol map, quoted or not, and skips spreads', (): void => {
  const source = [
    'export const iconSymbols = {',
    '  ...fileSymbols,',
    "  add: { sf: 'plus', material: 'add' },",
    "  'arrow-down': { sf: 'arrow.down', material: 'arrow_downward' },",
    '  atlas: {',
    "    sf: 'point.3.connected.trianglepath.dotted',",
    '  },',
    '};',
  ].join('\n');
  expect(iconNamesIn(source)).toEqual(['add', 'arrow-down', 'atlas']);
});

const file = snapshotOf([
  {
    id: 'b',
    name: 'Global Components',
    children: [
      {
        id: 'lib',
        name: 'Components / Icons',
        children: [{ id: 't1', name: 'Icon / add', type: 'SVG' }],
      },
    ],
  },
  {
    id: 's',
    name: 'Screens',
    children: [
      { id: 'i1', name: 'Icon / add', type: 'SVG' },
      { id: 'i2', name: 'Icon / caret-left', type: 'SVG' },
      { id: 'i3', name: 'Icon / caret-left', type: 'SVG' },
    ],
  },
]);

it('counts icon layers the app has no name for', (): void => {
  const drift = findIconDrift(file, new Set(['add', 'close']));
  expect(drift.unknown).toEqual([{ name: 'caret-left', count: 2 }]);
});

it('lists app icons with no tile in the library', (): void => {
  const drift = findIconDrift(file, new Set(['add', 'close']));
  expect(drift.unlisted).toEqual(['close']);
});
