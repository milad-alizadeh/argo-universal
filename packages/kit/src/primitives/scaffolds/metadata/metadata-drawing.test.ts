import { describe, expect, it } from 'vitest';
import {
  metadataDrawing,
  type MetadataFacts,
  type MetadataFieldLayout,
  type MetadataPlatform,
  type MetadataRoot,
  type MetadataWidth,
} from './metadata-drawing';

type Case = [MetadataFacts, Picks];

type Picks = { root: MetadataRoot; field: MetadataFieldLayout };

const rows: Picks = { root: 'grouped-rows', field: 'beside' };

const underRows: Picks = { root: 'grouped-rows', field: 'under' };

const column: Picks = { root: 'properties', field: 'stacked' };

const line: Picks = { root: 'inline', field: 'inline' };

const section = (field: MetadataFieldLayout): Picks => ({
  root: 'list-section',
  field,
});

const on = (
  platform: MetadataPlatform,
  inList: boolean,
  width: MetadataWidth,
): MetadataFacts => ({ platform, inList, width });

// The drawing for each platform, whether it is inside a List, and the width: the whole table of facts.
const table: Case[] = [
  [on('ios', false, 'column'), rows],
  [on('ios', false, 'narrow'), rows],
  [on('ios', true, 'column'), section('beside')],
  [on('ios', true, 'narrow'), section('beside')],
  [on('android', false, 'column'), underRows],
  [on('android', false, 'narrow'), underRows],
  [on('android', true, 'column'), section('under')],
  [on('android', true, 'narrow'), section('under')],
  [on('web', false, 'column'), column],
  [on('web', false, 'narrow'), line],
  [on('web', true, 'column'), section('stacked')],
  [on('web', true, 'narrow'), section('stacked')],
];

describe('which drawing Metadata picks', () => {
  it.each(table)('%j draws %j', (facts, picks) => {
    expect(metadataDrawing(facts)).toMatchObject(picks);
  });

  it('covers every platform, inside a List or not, at every width', () => {
    expect(table).toHaveLength(3 * 2 * 2);
  });

  it('mutes values on phones only', () => {
    const platforms: MetadataPlatform[] = ['ios', 'android', 'web'];

    const muted = platforms.map(
      (platform) =>
        metadataDrawing({ platform, inList: false, width: 'column' })
          .mutedValue,
    );

    expect(muted).toEqual([true, true, false]);
  });
});
