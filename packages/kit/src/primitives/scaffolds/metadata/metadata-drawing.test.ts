import { describe, expect, it } from 'vitest';
import type { AsidePlace } from '../screen/screen-aside-place';
import {
  metadataDrawing,
  type MetadataFacts,
  type MetadataFieldLayout,
  type MetadataPlatform,
  type MetadataRoot,
} from './metadata-drawing';

type Case = [MetadataFacts, Picks];

type Picks = { root: MetadataRoot; field: MetadataFieldLayout };

const picks = (root: MetadataRoot, field: MetadataFieldLayout): Picks => ({
  root,
  field,
});

const platforms: MetadataPlatform[] = ['ios', 'android', 'web'];

const rowsOf = { ios: 'beside', android: 'under', web: 'stacked' } as const;

const own = {
  ios: 'grouped-rows',
  android: 'grouped-rows',
  web: 'aside',
} as const;

const on = (
  platform: MetadataPlatform,
  inList: boolean,
  place: AsidePlace | null,
): MetadataFacts => ({ platform, inList, place });

// A Screen's aside draws the same on every platform: its column, a row of Pills, or Pills that show their icon alone.
const asideTable: Case[] = platforms.flatMap((platform) => [
  [on(platform, false, 'aside'), picks('aside', 'value')],
  [on(platform, false, 'pills'), picks('pills', 'pill')],
  [on(platform, false, 'icons'), picks('icons', 'icon')],
]);

// Anywhere else: one more section of the List it sits in, or the platform's own rows.
const ownTable: Case[] = platforms.flatMap((platform) => [
  [on(platform, true, null), picks('list-section', rowsOf[platform])],
  [
    on(platform, false, null),
    picks(own[platform], platform === 'web' ? 'value' : rowsOf[platform]),
  ],
]);

describe('which drawing Metadata picks', () => {
  it.each(asideTable)('%j draws %j', (facts, expected) => {
    expect(metadataDrawing(facts)).toMatchObject(expected);
  });

  it.each(ownTable)('%j draws %j', (facts, expected) => {
    expect(metadataDrawing(facts)).toMatchObject(expected);
  });

  it('covers every platform in every aside place, and outside one', () => {
    expect(asideTable.length + ownTable.length).toBe(3 * 3 + 3 * 2);
  });

  it('mutes values on phones only', () => {
    const muted = platforms.map(
      (platform) => metadataDrawing(on(platform, false, null)).mutedValue,
    );

    expect(muted).toEqual([true, true, false]);
  });
});
