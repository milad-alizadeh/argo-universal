import { expect, it } from 'vitest';
import {
  chipCopy,
  chipMaster,
  componentBoard,
  screen,
  snapshotOf,
} from './paper-drift.mocks.mts';
import { bootstrapRegistry } from './paper-drift/registry-bootstrap.mts';
import {
  formatRegistry,
  parseRegistry,
  pairingRules,
} from './paper-drift/registry.mts';
import {
  findVariantDrift,
  expectedStyles,
} from './paper-drift/variant-drift.mts';

function registryText(masters: object[]): string {
  return JSON.stringify({ fileId: 'file', masters });
}

it('rejects a name registered twice', (): void => {
  const text = registryText([
    { name: 'Chip', id: 'a' },
    { name: 'Chip', id: 'b' },
  ]);
  expect((): unknown => parseRegistry(text)).toThrow(
    '"Chip" is registered twice',
  );
});

it('rejects a variation of a variation', (): void => {
  const text = registryText([
    { name: 'A', id: 'a' },
    { name: 'A / B', id: 'b', variantOf: 'A' },
    { name: 'A / C', id: 'c', variantOf: 'A / B' },
  ]);
  expect((): unknown => parseRegistry(text)).toThrow('A / C → A / B');
});

it('rejects an unknown field', (): void => {
  expect((): unknown =>
    parseRegistry(registryText([{ name: 'A', id: 'a', colour: 'red' }])),
  ).toThrow('colour');
});

it('formats masters sorted by name', (): void => {
  const text = formatRegistry({
    fileId: 'file',
    masters: [
      { name: 'B', id: 'b' },
      { name: 'A', id: 'a' },
    ],
  });
  expect(
    parseRegistry(text).masters.map((entry): string => entry.name),
  ).toEqual(['A', 'B']);
});

it('treats two states of one family as a state switch', (): void => {
  const rules = pairingRules(
    parseRegistry(
      registryText([
        { name: 'Dot / Off', id: 'a' },
        { name: 'Dot / On', id: 'b', variantOf: 'Dot / Off' },
      ]),
    ),
  );
  expect(rules.isStateSwitch('Dot / Off', 'Dot / On')).toBe(true);
  expect(rules.isStateSwitch('Dot / Off', 'Chip')).toBe(false);
});

it('applies set and unset props to the base styles', (): void => {
  const props = { '1': { color: 'red', gap: null } };
  expect(
    expectedStyles({ gap: '4px', color: 'blue', width: '1px' }, props, '1'),
  ).toEqual({ color: 'red', width: '1px' });
});

it('bootstraps presented masters, a family with props and a shell', (): void => {
  const off = {
    id: 'off',
    name: 'Dot / Off',
    styles: { backgroundColor: '#A3A3A3' },
  };
  const on = {
    id: 'on',
    name: 'Dot / On',
    styles: { backgroundColor: '#22C55E' },
  };
  const shell = {
    id: 'panel',
    name: 'Panel',
    styles: { padding: '8px' },
    children: [{ id: 's1', name: 'A' }],
  };
  const shellUse = {
    id: 'panel2',
    name: 'Panel',
    styles: { padding: '8px' },
    children: [{ id: 's2', name: 'B' }],
  };
  const snapshot = snapshotOf([
    componentBoard(chipMaster(), off, on, shell),
    screen(chipCopy('a'), shellUse),
  ]);
  const { registry, skipped } = bootstrapRegistry(snapshot);
  expect(skipped).toEqual([]);
  expect(registry.masters).toEqual([
    { name: 'Chip', id: 'chip' },
    { name: 'Dot / Off', id: 'off' },
    {
      name: 'Dot / On',
      id: 'on',
      variantOf: 'Dot / Off',
      props: { '': { backgroundColor: '#22C55E' } },
    },
    { name: 'Panel', id: 'panel', shell: true },
  ]);
  expect(findVariantDrift(snapshot, registry)).toEqual([]);
});

it('reports a variation that differs beyond its props', (): void => {
  const off = {
    id: 'off',
    name: 'Dot / Off',
    styles: { backgroundColor: '#A3A3A3', width: '8px' },
  };
  const on = {
    id: 'on',
    name: 'Dot / On',
    styles: { backgroundColor: '#22C55E', width: '8px', opacity: '0.5' },
  };
  const snapshot = snapshotOf([componentBoard(off, on)]);
  const registry = parseRegistry(
    registryText([
      { name: 'Dot / Off', id: 'off' },
      {
        name: 'Dot / On',
        id: 'on',
        variantOf: 'Dot / Off',
        props: { '': { backgroundColor: '#22C55E' } },
      },
    ]),
  );
  const [found] = findVariantDrift(snapshot, registry);
  expect(found?.drift[0]?.changes).toEqual([
    { property: 'opacity', master: undefined, copy: '0.5' },
  ]);
});
