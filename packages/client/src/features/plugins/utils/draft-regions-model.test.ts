import type { PluginManifest } from '@repo/contracts/plugins';
import { draftVariantKey } from '@repo/contracts/plugins/drafts';
import { expect, it } from 'vitest';
import type { DraftEntry } from './draft-bar-model';
import {
  draftRegionsOf,
  stepChange,
  steppedVariant,
} from './draft-regions-model';

type Drafts = NonNullable<PluginManifest['contributes']['drafts']>;

const drafts: Drafts = [
  {
    page: '/',
    states: ['populated'],
    regions: [
      {
        id: 'header',
        variants: [
          { id: 'compact', name: 'Compact' },
          { id: 'tabs', name: 'Tabs' },
          { id: 'search', name: 'Search' },
        ],
      },
      {
        id: 'list',
        variants: [
          { id: 'rows', name: 'Rows' },
          { id: 'cards', name: 'Cards' },
        ],
      },
    ],
  },
];

const entry = (dev?: boolean, declared: Drafts = drafts): DraftEntry => ({
  ...(dev !== undefined && { dev }),
  manifest: { contributes: { drafts: declared } },
});

it('tags each region with its label and its first Variant until one is picked', () => {
  expect(draftRegionsOf(entry(true), '/', {})).toEqual([
    {
      id: 'header',
      label: 'Header',
      variant: 'compact',
      letter: 'A',
      position: 1,
      count: 3,
    },
    {
      id: 'list',
      label: 'List',
      variant: 'rows',
      letter: 'A',
      position: 1,
      count: 2,
    },
  ]);
});

it('reads each region pick from the Page state, so picks mix across regions', () => {
  const tags = draftRegionsOf(entry(true), '/', {
    [draftVariantKey('header')]: 'tabs',
    [draftVariantKey('list')]: 'rows',
  });

  expect(tags?.map(({ letter, position }) => [letter, position])).toEqual([
    ['B', 2],
    ['A', 1],
  ]);
  expect(tags?.map(({ variant }) => variant)).toEqual(['tabs', 'rows']);
});

it('falls back to the first Variant for a pick the Draft no longer declares', () => {
  const tags = draftRegionsOf(entry(true), '/', {
    [draftVariantKey('list')]: 'gone',
  });

  expect(tags?.[1]).toMatchObject({ letter: 'A', position: 1 });
});

it.each([
  ['a Plugin the Server does not call dev', entry(), '/'],
  ['a Plugin the Server calls not dev', entry(false), '/'],
  ['a page the Plugin does not declare as a Draft', entry(true), '/other'],
  [
    'a Draft that declares no regions',
    entry(true, [{ page: '/', states: ['populated'] }]),
    '/',
  ],
])('draws no tags for %s', (_name, listed, path) => {
  expect(draftRegionsOf(listed, path, {})).toBeNull();
});

it('steps to the next Variant and the previous one, wrapping at either end', () => {
  const region = drafts[0]?.regions?.[0];

  if (!region) throw new Error('fixture has a header region');

  expect(steppedVariant(region, 'compact', 1)).toBe('tabs');
  expect(steppedVariant(region, 'search', 1)).toBe('compact');
  expect(steppedVariant(region, 'compact', -1)).toBe('search');
  expect(steppedVariant(region, 'tabs', -1)).toBe('compact');
});

it('writes the stepped Variant under the stepped region only, from the pick in the Page state', () => {
  const page = drafts[0];

  expect(stepChange({ declared: page, pageState: {} }, 'header', 1)).toEqual({
    [draftVariantKey('header')]: 'tabs',
  });
  expect(
    stepChange(
      { declared: page, pageState: { [draftVariantKey('list')]: 'cards' } },
      'list',
      1,
    ),
  ).toEqual({ [draftVariantKey('list')]: 'rows' });
  expect(stepChange({ declared: page, pageState: {} }, 'header', -1)).toEqual({
    [draftVariantKey('header')]: 'search',
  });
  expect(stepChange({ declared: page, pageState: {} }, 'footer', 1)).toBeNull();
});
