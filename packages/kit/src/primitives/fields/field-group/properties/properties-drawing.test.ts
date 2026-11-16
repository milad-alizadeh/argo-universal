import { describe, expect, it } from 'vitest';
import type { AsidePlace } from '#kit/aside-place-context';
import {
  propertiesDrawing,
  type PropertiesFacts,
  type PropertyFieldLayout,
  type PropertiesPlatform,
  type PropertiesRoot,
} from './properties-drawing';

type Case = [PropertiesFacts, Picks];

type Picks = { root: PropertiesRoot; field: PropertyFieldLayout };

const picks = (root: PropertiesRoot, field: PropertyFieldLayout): Picks => ({
  root,
  field,
});

const platforms: PropertiesPlatform[] = ['ios', 'android', 'web'];

const rowsOf = { ios: 'beside', android: 'under', web: 'stacked' } as const;

const own = {
  ios: 'grouped-rows',
  android: 'grouped-rows',
  web: 'aside',
} as const;

const on = (
  platform: PropertiesPlatform,
  inList: boolean,
  place: AsidePlace | null,
): PropertiesFacts => ({ platform, inList, place });

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

describe('which drawing a read-only FieldGroup picks', () => {
  it.each(asideTable)('%j draws %j', (facts, expected) => {
    expect(propertiesDrawing(facts)).toMatchObject(expected);
  });

  it.each(ownTable)('%j draws %j', (facts, expected) => {
    expect(propertiesDrawing(facts)).toMatchObject(expected);
  });

  it('covers every platform in every aside place, and outside one', () => {
    expect(asideTable.length + ownTable.length).toBe(3 * 3 + 3 * 2);
  });

  it('mutes values on phones only', () => {
    const muted = platforms.map(
      (platform) => propertiesDrawing(on(platform, false, null)).mutedValue,
    );

    expect(muted).toEqual([true, true, false]);
  });
});
