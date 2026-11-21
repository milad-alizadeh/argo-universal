import type { PluginManifest } from '@repo/contracts/plugins';
import { draftVariantKey } from '@repo/contracts/plugins/drafts';
import { expect, it } from 'vitest';
import type { DraftEntry } from './draft-bar-model';
import { draftPicksOf } from './draft-picks';

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
        ],
      },
      { id: 'list', variants: [{ id: 'rows', name: 'Rows' }] },
    ],
  },
];

const entry = (dev?: boolean): DraftEntry => ({
  ...(dev !== undefined && { dev }),
  manifest: { contributes: { drafts } },
});

it('picks the Variant each region shows, the first for a region the author has not stepped', () => {
  expect(
    draftPicksOf(entry(true), '/', { [draftVariantKey('header')]: 'tabs' }),
  ).toEqual([
    { region: 'header', variant: 'tabs' },
    { region: 'list', variant: 'rows' },
  ]);
});

it('rests a region whose picked Variant is no longer declared on its first Variant, as its tag does', () => {
  expect(
    draftPicksOf(entry(true), '/', { [draftVariantKey('header')]: 'gone' }),
  ).toContainEqual({ region: 'header', variant: 'compact' });
});

it('picks nothing for a page without regions, a shipped Plugin or no Plugin', () => {
  expect(draftPicksOf(entry(true), '/other', {})).toBeNull();
  expect(draftPicksOf(entry(), '/', {})).toBeNull();
  expect(draftPicksOf(null, '/', {})).toBeNull();
});
