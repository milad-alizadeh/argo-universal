import type { PluginManifest } from '@repo/contracts/plugins';
import { draftVariantKey } from '@repo/contracts/plugins/drafts';
import { expect, it } from 'vitest';
import type { DraftEntry } from './draft-bar-model';
import { draftRegionsOf } from './draft-regions-model';

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

it('labels a region as its id capitalised, dashes kept, ', () => {
  const tags = draftRegionsOf(
    entry(true, [
      {
        page: '/',
        states: ['populated'],
        regions: [{ id: 'side-bar', variants: [{ id: 'a', name: 'A' }] }],
      },
    ]),
    '/',
    {},
  );

  expect(tags?.[0]?.label).toBe('Side-bar');
});
